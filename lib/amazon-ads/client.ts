import { gunzipSync } from 'zlib'

// Thin client for the Amazon Ads API (Sponsored Products v3 + Reporting v3).
// Docs: https://advertising.amazon.com/API/docs/en-us

export type Region = 'NA' | 'EU' | 'FE'

const REGIONS: Record<Region, { api: string; token: string; authorize: string }> = {
  NA: {
    api: 'https://advertising-api.amazon.com',
    token: 'https://api.amazon.com/auth/o2/token',
    authorize: 'https://www.amazon.com/ap/oa',
  },
  EU: {
    api: 'https://advertising-api-eu.amazon.com',
    token: 'https://api.amazon.co.uk/auth/o2/token',
    authorize: 'https://eu.account.amazon.com/ap/oa',
  },
  FE: {
    api: 'https://advertising-api-fe.amazon.com',
    token: 'https://api.amazon.co.jp/auth/o2/token',
    authorize: 'https://apac.account.amazon.com/ap/oa',
  },
}

export function isRegion(value: unknown): value is Region {
  return value === 'NA' || value === 'EU' || value === 'FE'
}

function credentials() {
  const clientId = process.env.AMAZON_ADS_CLIENT_ID
  const clientSecret = process.env.AMAZON_ADS_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('AMAZON_ADS_CLIENT_ID and AMAZON_ADS_CLIENT_SECRET must be set')
  }
  return { clientId, clientSecret }
}

export function redirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/amazon-ads/callback`
}

// ─── OAuth (Login with Amazon) ──────────────────────────────

export function authorizeUrl(region: Region, state: string): string {
  const params = new URLSearchParams({
    client_id: credentials().clientId,
    scope: 'advertising::campaign_management',
    response_type: 'code',
    redirect_uri: redirectUri(),
    state,
  })
  return `${REGIONS[region].authorize}?${params}`
}

async function tokenRequest(region: Region, body: Record<string, string>) {
  const { clientId, clientSecret } = credentials()
  const res = await fetch(REGIONS[region].token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...body, client_id: clientId, client_secret: clientSecret }),
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(`Amazon token error: ${json.error_description ?? json.error ?? res.status}`)
  }
  return json as { access_token: string; refresh_token: string; expires_in: number }
}

export function exchangeCode(region: Region, code: string) {
  return tokenRequest(region, { grant_type: 'authorization_code', code, redirect_uri: redirectUri() })
}

// ─── API client ─────────────────────────────────────────────

export interface AmazonProfile {
  profileId: number
  countryCode: string
  currencyCode: string
  accountInfo: { name?: string; type: string; id: string }
}

interface MultiStatus {
  success?: { index: number }[]
  error?: { index: number; errors?: { errorType?: string; errorValue?: unknown }[] }[]
}

export interface BatchResult {
  index: number
  ok: boolean
  error?: string
}

const SP = {
  campaign: 'application/vnd.spCampaign.v3+json',
  keyword: 'application/vnd.spKeyword.v3+json',
  target: 'application/vnd.spTargetingClause.v3+json',
  negativeKeyword: 'application/vnd.spNegativeKeyword.v3+json',
  report: 'application/vnd.createasyncreportrequest.v3+json',
}

export class AmazonAdsClient {
  private accessToken: string | null = null

  constructor(
    private region: Region,
    private refreshToken: string,
    private profileId: string | null = null
  ) {}

  private async token(): Promise<string> {
    if (!this.accessToken) {
      const t = await tokenRequest(this.region, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
      })
      this.accessToken = t.access_token
    }
    return this.accessToken
  }

  private async request<T>(
    method: string,
    path: string,
    opts: { body?: unknown; contentType?: string; scoped?: boolean } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.token()}`,
      'Amazon-Advertising-API-ClientId': credentials().clientId,
    }
    if (opts.scoped !== false) {
      if (!this.profileId) throw new Error('No Amazon Ads profile selected')
      headers['Amazon-Advertising-API-Scope'] = this.profileId
    }
    if (opts.contentType) {
      headers['Content-Type'] = opts.contentType
      headers['Accept'] = opts.contentType
    }

    // Amazon throttles aggressively; retry 429/5xx with backoff.
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${REGIONS[this.region].api}${path}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      })
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        const retryAfter = Number(res.headers.get('Retry-After'))
        await new Promise((r) => setTimeout(r, (retryAfter || 2 ** attempt) * 1000))
        continue
      }
      const text = await res.text()
      if (!res.ok) throw new Error(`Amazon Ads API ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`)
      return (text ? JSON.parse(text) : {}) as T
    }
  }

  listProfiles() {
    return this.request<AmazonProfile[]>('GET', '/v2/profiles', { scoped: false })
  }

  // ─── Reporting v3 ──────────────────────────────────────────

  async createReport(
    name: string,
    reportTypeId: 'spCampaigns' | 'spTargeting' | 'spSearchTerm',
    groupBy: string[],
    columns: string[],
    startDate: string,
    endDate: string
  ): Promise<string> {
    const res = await this.request<{ reportId: string }>('POST', '/reporting/reports', {
      contentType: SP.report,
      body: {
        name,
        startDate,
        endDate,
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          reportTypeId,
          groupBy,
          columns,
          timeUnit: 'SUMMARY',
          format: 'GZIP_JSON',
        },
      },
    })
    return res.reportId
  }

  getReport(reportId: string) {
    return this.request<{ status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; url?: string; failureReason?: string }>(
      'GET',
      `/reporting/reports/${reportId}`
    )
  }

  async downloadReport<T>(url: string): Promise<T[]> {
    // The download URL is a pre-signed S3 link — no auth headers.
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Report download failed: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    // Amazon IDs can exceed Number.MAX_SAFE_INTEGER; quote them before parsing so no precision is lost.
    const json = gunzipSync(buf)
      .toString('utf8')
      .replace(/("(?:campaignId|adGroupId|keywordId|targetId|portfolioId)"\s*:\s*)(\d+)/g, '$1"$2"')
    return JSON.parse(json) as T[]
  }

  // ─── Sponsored Products writes ────────────────────────────

  private static results(multi: MultiStatus | undefined, count: number): BatchResult[] {
    const out: BatchResult[] = Array.from({ length: count }, (_, index) => ({
      index,
      ok: false,
      error: 'No response from Amazon',
    }))
    for (const s of multi?.success ?? []) out[s.index] = { index: s.index, ok: true }
    for (const e of multi?.error ?? []) {
      const first = e.errors?.[0]
      out[e.index] = { index: e.index, ok: false, error: first?.errorType ?? 'Unknown error' }
    }
    return out
  }

  async updateKeywords(items: { keywordId: string; bid?: number; state?: 'PAUSED' }[]) {
    const res = await this.request<{ keywords?: MultiStatus }>('PUT', '/sp/keywords', {
      contentType: SP.keyword,
      body: { keywords: items },
    })
    return AmazonAdsClient.results(res.keywords, items.length)
  }

  async updateTargets(items: { targetId: string; bid?: number; state?: 'PAUSED' }[]) {
    const res = await this.request<{ targetingClauses?: MultiStatus }>('PUT', '/sp/targets', {
      contentType: SP.target,
      body: { targetingClauses: items },
    })
    return AmazonAdsClient.results(res.targetingClauses, items.length)
  }

  async createKeywords(items: { campaignId: string; adGroupId: string; keywordText: string; bid: number }[]) {
    const res = await this.request<{ keywords?: MultiStatus }>('POST', '/sp/keywords', {
      contentType: SP.keyword,
      body: { keywords: items.map((k) => ({ ...k, matchType: 'EXACT', state: 'ENABLED' })) },
    })
    return AmazonAdsClient.results(res.keywords, items.length)
  }

  async createNegativeKeywords(items: { campaignId: string; adGroupId: string; keywordText: string }[]) {
    const res = await this.request<{ negativeKeywords?: MultiStatus }>('POST', '/sp/negativeKeywords', {
      contentType: SP.negativeKeyword,
      body: {
        negativeKeywords: items.map((k) => ({ ...k, matchType: 'NEGATIVE_EXACT', state: 'ENABLED' })),
      },
    })
    return AmazonAdsClient.results(res.negativeKeywords, items.length)
  }

  async updateCampaignBudgets(items: { campaignId: string; budget: number }[]) {
    const res = await this.request<{ campaigns?: MultiStatus }>('PUT', '/sp/campaigns', {
      contentType: SP.campaign,
      body: {
        campaigns: items.map((c) => ({
          campaignId: c.campaignId,
          budget: { budget: c.budget, budgetType: 'DAILY' },
        })),
      },
    })
    return AmazonAdsClient.results(res.campaigns, items.length)
  }
}
