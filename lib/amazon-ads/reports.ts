import type { AccountData, CampaignPerf, SearchTermPerf, TargetPerf } from './optimizer'

// Amazon Ads Reporting v3 definitions and parsing into the optimiser's shapes.
// Kept free of runtime imports so it can be unit-tested directly with Node.

export type ReportName = 'campaigns' | 'targeting' | 'searchTerms'

const METRIC_COLUMNS = ['impressions', 'clicks', 'cost', 'sales7d', 'purchases7d']

export const REPORTS: Record<ReportName, { type: 'spCampaigns' | 'spTargeting' | 'spSearchTerm'; groupBy: string[]; columns: string[] }> = {
  campaigns: {
    type: 'spCampaigns',
    groupBy: ['campaign'],
    columns: ['campaignId', 'campaignName', 'campaignStatus', 'campaignBudgetAmount', ...METRIC_COLUMNS],
  },
  targeting: {
    type: 'spTargeting',
    groupBy: ['targeting'],
    columns: [
      'campaignId', 'campaignName', 'adGroupId', 'keywordId', 'keyword', 'targeting',
      'matchType', 'keywordBid', ...METRIC_COLUMNS,
    ],
  },
  searchTerms: {
    type: 'spSearchTerm',
    groupBy: ['searchTerm'],
    columns: ['campaignId', 'campaignName', 'adGroupId', 'keywordId', 'matchType', 'searchTerm', ...METRIC_COLUMNS],
  },
}

// ─── report parsing ─────────────────────────────────────────

export type ReportRow = Record<string, unknown>
type Row = ReportRow

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0)
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))

function metrics(r: Row) {
  return {
    impressions: num(r.impressions),
    clicks: num(r.clicks),
    cost: num(r.cost),
    sales: num(r.sales7d),
    orders: num(r.purchases7d),
  }
}

const KEYWORD_MATCH_TYPES = new Set(['BROAD', 'PHRASE', 'EXACT'])

export function parseReports(raw: Record<ReportName, Row[]>): AccountData {
  const campaigns: CampaignPerf[] = raw.campaigns.map((r) => ({
    campaignId: str(r.campaignId),
    campaignName: str(r.campaignName),
    status: str(r.campaignStatus).toUpperCase(),
    dailyBudget: num(r.campaignBudgetAmount),
    ...metrics(r),
  }))

  const targets: TargetPerf[] = raw.targeting
    .filter((r) => r.keywordId)
    .map((r) => {
      const matchType = str(r.matchType).toUpperCase()
      const isKeyword = KEYWORD_MATCH_TYPES.has(matchType)
      return {
        id: str(r.keywordId),
        kind: isKeyword ? ('keyword' as const) : ('target' as const),
        text: str(isKeyword ? r.keyword : r.targeting) || str(r.keyword) || str(r.targeting),
        matchType,
        bid: num(r.keywordBid),
        campaignId: str(r.campaignId),
        campaignName: str(r.campaignName),
        adGroupId: str(r.adGroupId),
        ...metrics(r),
      }
    })

  // A search term can be matched by several keywords in one ad group — merge them.
  const terms = new Map<string, SearchTermPerf>()
  for (const r of raw.searchTerms) {
    const searchTerm = str(r.searchTerm).trim().toLowerCase()
    if (!searchTerm) continue
    const key = `${str(r.adGroupId)}|${searchTerm}`
    const m = metrics(r)
    const matchType = str(r.matchType).toUpperCase()
    const prev = terms.get(key)
    if (!prev) {
      terms.set(key, {
        searchTerm,
        campaignId: str(r.campaignId),
        campaignName: str(r.campaignName),
        adGroupId: str(r.adGroupId),
        matchType,
        ...m,
      })
    } else {
      prev.impressions += m.impressions
      prev.clicks += m.clicks
      prev.cost += m.cost
      prev.sales += m.sales
      prev.orders += m.orders
      // Only treat the term as exact-matched if every source was an exact keyword.
      if (matchType !== 'EXACT') prev.matchType = matchType
    }
  }

  return { campaigns, targets, searchTerms: Array.from(terms.values()) }
}
