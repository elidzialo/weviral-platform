import type { SupabaseClient } from '@supabase/supabase-js'
import { AmazonAdsClient, type Region } from './client'
import { reviewWithAgent } from './agent'
import { proposeActions, resolveSettings, round2, type ProposedAction } from './optimizer'
import { parseReports, REPORTS, type ReportName, type ReportRow } from './reports'

// Orchestrates a run: request reports → (poll) → analyse → propose/apply.
// Amazon builds reports asynchronously (usually a few minutes), so a run is
// advanced by repeated calls to advanceRun from the UI poll or the cron job.

export interface Connection {
  id: string
  marketer_id: string
  region: Region
  refresh_token: string
  profile_id: string | null
  settings: Record<string, unknown>
  auto_apply: boolean
  schedule_enabled: boolean
}

export interface Run {
  id: string
  marketer_id: string
  profile_id: string
  status: 'reports_pending' | 'awaiting_approval' | 'completed' | 'failed'
  date_start: string
  date_end: string
  report_ids: Partial<Record<ReportName, string>>
  created_at: string
}

export interface ActionRow extends ProposedAction {
  id: string
  status: string
}

// Runs stuck waiting on Amazon for longer than this are failed.
const REPORT_TIMEOUT_MS = 3 * 60 * 60 * 1000
// Longer than the analysis route's maxDuration, so an expired lease means the worker died.
const LEASE_MS = 5 * 60 * 1000

export function clientFor(conn: Connection): AmazonAdsClient {
  return new AmazonAdsClient(conn.region, conn.refresh_token, conn.profile_id)
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function startRun(
  admin: SupabaseClient,
  conn: Connection,
  trigger: 'manual' | 'scheduled'
): Promise<Run> {
  if (!conn.profile_id) throw new Error('Select an Amazon Ads profile first')
  const settings = resolveSettings(conn.settings)

  // Amazon attribution lags; end the window yesterday.
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 1)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - settings.lookback_days + 1)
  const startDate = isoDate(start)
  const endDate = isoDate(end)

  const client = clientFor(conn)
  const report_ids: Partial<Record<ReportName, string>> = {}
  for (const [name, r] of Object.entries(REPORTS) as [ReportName, (typeof REPORTS)[ReportName]][]) {
    report_ids[name] = await client.createReport(
      `weviral-${name}-${startDate}-${endDate}-${Date.now()}`,
      r.type,
      r.groupBy,
      r.columns,
      startDate,
      endDate
    )
  }

  const { data, error } = await admin
    .from('amazon_ads_runs')
    .insert({
      marketer_id: conn.marketer_id,
      profile_id: conn.profile_id,
      trigger,
      date_start: startDate,
      date_end: endDate,
      report_ids,
    })
    .select('*')
    .single()
  if (error) throw new Error(`Failed to create run: ${error.message}`)
  return data as Run
}

// ─── advancing a run ────────────────────────────────────────

async function failRun(admin: SupabaseClient, runId: string, message: string) {
  await admin
    .from('amazon_ads_runs')
    .update({ status: 'failed', error: message.slice(0, 1000), locked_until: null, completed_at: new Date().toISOString() })
    .eq('id', runId)
}

// Returns the run's status after this step.
export async function advanceRun(admin: SupabaseClient, run: Run, conn: Connection): Promise<Run['status']> {
  if (run.status !== 'reports_pending') return run.status

  // Take a short lease so a UI poll and a cron tick don't both analyse the same run.
  const now = new Date()
  const { data: claimed } = await admin
    .from('amazon_ads_runs')
    .update({ locked_until: new Date(now.getTime() + LEASE_MS).toISOString() })
    .eq('id', run.id)
    .eq('status', 'reports_pending')
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select('id')
  if (!claimed?.length) return 'reports_pending'
  const release = () => admin.from('amazon_ads_runs').update({ locked_until: null }).eq('id', run.id)

  const client = new AmazonAdsClient(conn.region, conn.refresh_token, run.profile_id)

  try {
    const raw = {} as Record<ReportName, ReportRow[]>
    for (const name of Object.keys(REPORTS) as ReportName[]) {
      const id = run.report_ids[name]
      if (!id) throw new Error(`Missing ${name} report`)
      const report = await client.getReport(id)
      if (report.status === 'FAILED') throw new Error(`Amazon failed to build the ${name} report: ${report.failureReason ?? ''}`)
      if (report.status !== 'COMPLETED' || !report.url) {
        if (Date.now() - new Date(run.created_at).getTime() > REPORT_TIMEOUT_MS) {
          throw new Error('Timed out waiting for Amazon reports')
        }
        await release()
        return 'reports_pending'
      }
      raw[name] = await client.downloadReport<ReportRow>(report.url)
    }

    const settings = resolveSettings(conn.settings)
    const data = parseReports(raw)
    const review = await reviewWithAgent(data, proposeActions(data, settings), settings)

    const totals = data.campaigns.reduce(
      (t, c) => ({
        spend: t.spend + c.cost,
        sales: t.sales + c.sales,
        orders: t.orders + c.orders,
        clicks: t.clicks + c.clicks,
        impressions: t.impressions + c.impressions,
      }),
      { spend: 0, sales: 0, orders: 0, clicks: 0, impressions: 0 }
    )

    const toRow = (a: ProposedAction, status: 'proposed' | 'skipped', note?: string) => ({
      run_id: run.id,
      marketer_id: run.marketer_id,
      type: a.type,
      entity_kind: a.entity_kind,
      entity_id: a.entity_id,
      entity_name: a.entity_name,
      campaign_id: a.campaign_id,
      campaign_name: a.campaign_name,
      ad_group_id: a.ad_group_id,
      current_value: a.current_value,
      proposed_value: a.proposed_value,
      reason: note ? `${a.reason} Skipped by AI reviewer: ${note}` : a.reason,
      source: a.source,
      metrics: a.metrics,
      status,
    })

    const rows = [
      ...review.actions.map((a) => toRow(a, 'proposed')),
      ...review.skipped.map((s) => toRow(s.action, 'skipped', s.reason)),
    ]
    if (rows.length) {
      const { error } = await admin.from('amazon_ads_actions').insert(rows)
      if (error) throw new Error(`Failed to save actions: ${error.message}`)
    }

    const hasWork = review.actions.length > 0
    await admin
      .from('amazon_ads_runs')
      .update({
        status: hasWork ? 'awaiting_approval' : 'completed',
        totals: {
          spend: round2(totals.spend),
          sales: round2(totals.sales),
          orders: totals.orders,
          clicks: totals.clicks,
          impressions: totals.impressions,
          acos: totals.sales > 0 ? round2(totals.spend / totals.sales) : null,
        },
        summary: review.summary,
        insights: review.insights,
        model: review.model,
        locked_until: null,
        completed_at: hasWork ? null : new Date().toISOString(),
      })
      .eq('id', run.id)

    if (hasWork && conn.auto_apply) {
      const { data: pending } = await admin
        .from('amazon_ads_actions')
        .select('*')
        .eq('run_id', run.id)
        .eq('status', 'proposed')
      await applyActions(admin, conn, run, (pending ?? []) as ActionRow[])
      return 'completed'
    }
    return hasWork ? 'awaiting_approval' : 'completed'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failRun(admin, run.id, message)
    return 'failed'
  }
}

// ─── applying actions ───────────────────────────────────────

export async function applyActions(
  admin: SupabaseClient,
  conn: Connection,
  run: Pick<Run, 'id' | 'profile_id'>,
  actions: ActionRow[]
): Promise<{ applied: number; failed: number }> {
  const client = new AmazonAdsClient(conn.region, conn.refresh_token, run.profile_id)
  const outcomes = new Map<string, { ok: boolean; error?: string }>()

  // Run one Amazon batch call and map results back to our action ids.
  async function batch<T>(
    items: ActionRow[],
    toPayload: (a: ActionRow) => T,
    call: (payload: T[]) => Promise<{ index: number; ok: boolean; error?: string }[]>
  ) {
    // Amazon accepts up to 1000 entities per request; stay well under.
    for (let i = 0; i < items.length; i += 100) {
      const chunk = items.slice(i, i + 100)
      try {
        const results = await call(chunk.map(toPayload))
        results.forEach((r, idx) => outcomes.set(chunk[idx].id, { ok: r.ok, error: r.error }))
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        chunk.forEach((a) => outcomes.set(a.id, { ok: false, error }))
      }
    }
  }

  const of = (type: string, kind?: string) =>
    actions.filter((a) => a.type === type && (!kind || a.entity_kind === kind))
  const bid = (a: ActionRow) => Number(a.proposed_value)

  await batch(of('update_bid', 'keyword'), (a) => ({ keywordId: a.entity_id!, bid: bid(a) }), (p) => client.updateKeywords(p))
  await batch(of('update_bid', 'target'), (a) => ({ targetId: a.entity_id!, bid: bid(a) }), (p) => client.updateTargets(p))
  await batch(of('pause_target', 'keyword'), (a) => ({ keywordId: a.entity_id!, state: 'PAUSED' as const }), (p) => client.updateKeywords(p))
  await batch(of('pause_target', 'target'), (a) => ({ targetId: a.entity_id!, state: 'PAUSED' as const }), (p) => client.updateTargets(p))
  await batch(
    of('add_negative_keyword'),
    (a) => ({ campaignId: a.campaign_id, adGroupId: a.ad_group_id!, keywordText: a.entity_name }),
    (p) => client.createNegativeKeywords(p)
  )
  await batch(
    of('add_exact_keyword'),
    (a) => ({ campaignId: a.campaign_id, adGroupId: a.ad_group_id!, keywordText: a.entity_name, bid: bid(a) }),
    (p) => client.createKeywords(p)
  )
  await batch(of('update_budget'), (a) => ({ campaignId: a.entity_id!, budget: bid(a) }), (p) => client.updateCampaignBudgets(p))

  const now = new Date().toISOString()
  let applied = 0
  let failed = 0
  for (const a of actions) {
    const o = outcomes.get(a.id) ?? { ok: false, error: 'Unsupported action' }
    if (o.ok) applied++
    else failed++
    await admin
      .from('amazon_ads_actions')
      .update(o.ok ? { status: 'applied', applied_at: now, error: null } : { status: 'failed', error: o.error ?? 'Unknown error' })
      .eq('id', a.id)
  }

  await closeRunIfDone(admin, run.id)
  return { applied, failed }
}

// A run is complete once nothing is left waiting for a decision.
export async function closeRunIfDone(admin: SupabaseClient, runId: string) {
  const { count } = await admin
    .from('amazon_ads_actions')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', runId)
    .eq('status', 'proposed')
  if (count === 0) {
    await admin
      .from('amazon_ads_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', runId)
      .eq('status', 'awaiting_approval')
  }
}
