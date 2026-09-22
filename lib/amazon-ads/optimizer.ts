// Deterministic Sponsored Products optimisation rules.
// Pure functions only — no I/O — so the rules can be unit-tested and every
// action proposed by the AI reviewer can be re-validated against the same
// guardrails before it reaches Amazon.

export interface OptimizerSettings {
  target_acos: number          // e.g. 0.30 for 30%
  lookback_days: number        // report window used for the analysis
  min_clicks: number           // clicks needed before judging a target/search term
  max_bid_change_pct: number   // largest single bid move, e.g. 0.20 for ±20%
  min_bid: number
  max_bid: number
  harvest_min_orders: number   // orders needed before promoting a search term to exact
  budget_increase_pct: number  // step used when a profitable campaign is budget-capped
  max_daily_budget: number     // never raise a campaign budget above this
  max_actions_per_run: number
}

export const DEFAULT_SETTINGS: OptimizerSettings = {
  target_acos: 0.3,
  lookback_days: 14,
  min_clicks: 15,
  max_bid_change_pct: 0.2,
  min_bid: 0.1,
  max_bid: 5,
  harvest_min_orders: 2,
  budget_increase_pct: 0.2,
  max_daily_budget: 200,
  max_actions_per_run: 100,
}

// Allowed range for each user-editable setting. Anything outside is clamped.
const SETTING_LIMITS: Record<keyof OptimizerSettings, [number, number]> = {
  target_acos: [0.05, 1.5],
  lookback_days: [7, 60],
  min_clicks: [3, 500],
  max_bid_change_pct: [0.05, 0.5],
  min_bid: [0.02, 50],
  max_bid: [0.1, 100],
  harvest_min_orders: [1, 50],
  budget_increase_pct: [0.05, 1],
  max_daily_budget: [1, 100000],
  max_actions_per_run: [1, 500],
}

export function resolveSettings(raw: unknown): OptimizerSettings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out = { ...DEFAULT_SETTINGS }
  for (const key of Object.keys(SETTING_LIMITS) as (keyof OptimizerSettings)[]) {
    const v = Number(input[key])
    if (input[key] === undefined || input[key] === null || !Number.isFinite(v)) continue
    const [lo, hi] = SETTING_LIMITS[key]
    out[key] = Math.min(Math.max(v, lo), hi)
  }
  out.lookback_days = Math.round(out.lookback_days)
  out.min_clicks = Math.round(out.min_clicks)
  out.harvest_min_orders = Math.round(out.harvest_min_orders)
  out.max_actions_per_run = Math.round(out.max_actions_per_run)
  if (out.max_bid < out.min_bid) out.max_bid = out.min_bid
  return out
}

export interface Metrics {
  impressions: number
  clicks: number
  cost: number
  sales: number
  orders: number
}

export interface CampaignPerf extends Metrics {
  campaignId: string
  campaignName: string
  status: string
  dailyBudget: number
}

// A keyword or product/auto target, as returned by the spTargeting report.
export interface TargetPerf extends Metrics {
  id: string                  // keywordId or targetId
  kind: 'keyword' | 'target'
  text: string                // keyword text or targeting expression
  matchType: string           // BROAD / PHRASE / EXACT / TARGETING_EXPRESSION...
  bid: number
  campaignId: string
  campaignName: string
  adGroupId: string
}

export interface SearchTermPerf extends Metrics {
  searchTerm: string
  campaignId: string
  campaignName: string
  adGroupId: string
  matchType: string           // match type of the keyword/target that triggered it
}

export type ActionType =
  | 'update_bid'
  | 'pause_target'
  | 'add_negative_keyword'
  | 'add_exact_keyword'
  | 'update_budget'

export interface ProposedAction {
  key: string                 // stable id within a run, used by the reviewer
  type: ActionType
  entity_kind: 'keyword' | 'target' | 'search_term' | 'campaign'
  entity_id: string | null
  entity_name: string
  campaign_id: string
  campaign_name: string
  ad_group_id: string | null
  current_value: number | null
  proposed_value: number | null
  reason: string
  source: 'rules' | 'agent'
  metrics: Metrics
}

export interface AccountData {
  campaigns: CampaignPerf[]
  targets: TargetPerf[]
  searchTerms: SearchTermPerf[]
}

// ─── helpers ────────────────────────────────────────────────

export function acos(m: Pick<Metrics, 'cost' | 'sales'>): number | null {
  return m.sales > 0 ? m.cost / m.sales : null
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function clampBid(current: number, proposed: number, s: OptimizerSettings): number {
  const lo = Math.max(s.min_bid, current * (1 - s.max_bid_change_pct))
  const hi = Math.min(s.max_bid, current * (1 + s.max_bid_change_pct))
  // If current is already outside [min_bid, max_bid], lo may exceed hi; pull it back in range.
  if (lo > hi) return round2(Math.min(Math.max(proposed, s.min_bid), s.max_bid))
  return round2(Math.min(Math.max(proposed, lo), hi))
}

// Exact keywords can only be added to manual-targeting ad groups, so only
// harvest search terms that came from broad/phrase keywords (not auto targets).
export function canHarvestFrom(matchType: string): boolean {
  return matchType === 'BROAD' || matchType === 'PHRASE'
}

// Amazon search terms that are ASINs cannot be added as negative keywords.
export function isAsin(term: string): boolean {
  return /^b0[a-z0-9]{8}$/i.test(term.trim())
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function money(n: number): string {
  return n.toFixed(2)
}

function pick(m: Metrics): Metrics {
  return {
    impressions: m.impressions,
    clicks: m.clicks,
    cost: round2(m.cost),
    sales: round2(m.sales),
    orders: m.orders,
  }
}

// ─── rules ──────────────────────────────────────────────────

export function bidRules(targets: TargetPerf[], s: OptimizerSettings): ProposedAction[] {
  const actions: ProposedAction[] = []

  for (const t of targets) {
    if (t.clicks < s.min_clicks || t.bid <= 0) continue
    const base = {
      entity_kind: t.kind,
      entity_id: t.id,
      entity_name: `${t.text} (${t.matchType})`,
      campaign_id: t.campaignId,
      campaign_name: t.campaignName,
      ad_group_id: t.adGroupId,
      current_value: t.bid,
      source: 'rules' as const,
      metrics: pick(t),
    }

    if (t.orders === 0) {
      // Twice the click threshold with no sale: stop the bleed entirely.
      if (t.clicks >= s.min_clicks * 2) {
        actions.push({
          ...base,
          key: `pause:${t.kind}:${t.id}`,
          type: 'pause_target',
          proposed_value: null,
          reason: `${t.clicks} clicks and ${money(t.cost)} spend with no orders.`,
        })
      } else {
        const next = clampBid(t.bid, t.bid * (1 - s.max_bid_change_pct), s)
        if (next < t.bid) {
          actions.push({
            ...base,
            key: `bid:${t.kind}:${t.id}`,
            type: 'update_bid',
            proposed_value: next,
            reason: `${t.clicks} clicks with no orders — lowering bid.`,
          })
        }
      }
      continue
    }

    const a = acos(t)
    if (a === null) continue
    // Scale the bid proportionally towards the target ACoS, capped per run.
    const next = clampBid(t.bid, t.bid * (s.target_acos / a), s)
    if (Math.abs(next - t.bid) / t.bid < 0.05) continue
    actions.push({
      ...base,
      key: `bid:${t.kind}:${t.id}`,
      type: 'update_bid',
      proposed_value: next,
      reason:
        next > t.bid
          ? `ACoS ${pct(a)} is below the ${pct(s.target_acos)} target — room to win more traffic.`
          : `ACoS ${pct(a)} is above the ${pct(s.target_acos)} target.`,
    })
  }

  return actions
}

export function searchTermRules(data: AccountData, s: OptimizerSettings): ProposedAction[] {
  const actions: ProposedAction[] = []

  // Exact keywords already live in each ad group, so we don't harvest duplicates.
  const existingExact = new Set(
    data.targets
      .filter((t) => t.kind === 'keyword' && t.matchType === 'EXACT')
      .map((t) => `${t.adGroupId}|${t.text.toLowerCase()}`)
  )

  for (const st of data.searchTerms) {
    const term = st.searchTerm.trim().toLowerCase()
    if (!term || isAsin(term)) continue
    const base = {
      entity_kind: 'search_term' as const,
      entity_id: null,
      entity_name: term,
      campaign_id: st.campaignId,
      campaign_name: st.campaignName,
      ad_group_id: st.adGroupId,
      source: 'rules' as const,
      metrics: pick(st),
    }

    if (st.orders === 0 && st.clicks >= s.min_clicks && st.matchType !== 'EXACT') {
      actions.push({
        ...base,
        key: `neg:${st.adGroupId}:${term}`,
        type: 'add_negative_keyword',
        current_value: null,
        proposed_value: null,
        reason: `Search term drew ${st.clicks} clicks (${money(st.cost)} spend) with no orders.`,
      })
      continue
    }

    const a = acos(st)
    if (
      st.orders >= s.harvest_min_orders &&
      a !== null &&
      a <= s.target_acos &&
      canHarvestFrom(st.matchType) &&
      !existingExact.has(`${st.adGroupId}|${term}`)
    ) {
      const cpc = st.clicks > 0 ? st.cost / st.clicks : s.min_bid
      const bid = round2(Math.min(Math.max(cpc, s.min_bid), s.max_bid))
      actions.push({
        ...base,
        key: `harvest:${st.adGroupId}:${term}`,
        type: 'add_exact_keyword',
        current_value: null,
        proposed_value: bid,
        reason: `${st.orders} orders at ${pct(a)} ACoS — promote to an exact-match keyword.`,
      })
      existingExact.add(`${st.adGroupId}|${term}`)
    }
  }

  return actions
}

export function budgetRules(campaigns: CampaignPerf[], s: OptimizerSettings): ProposedAction[] {
  const actions: ProposedAction[] = []

  for (const c of campaigns) {
    if (c.status !== 'ENABLED' || c.dailyBudget <= 0 || c.orders === 0) continue
    const a = acos(c)
    if (a === null) continue
    const avgDailySpend = c.cost / s.lookback_days
    // Consistently spending ≥90% of budget while comfortably profitable → likely capped.
    if (avgDailySpend < c.dailyBudget * 0.9 || a > s.target_acos * 0.8) continue
    const next = round2(Math.min(c.dailyBudget * (1 + s.budget_increase_pct), s.max_daily_budget))
    if (next <= c.dailyBudget) continue
    actions.push({
      key: `budget:${c.campaignId}`,
      type: 'update_budget',
      entity_kind: 'campaign',
      entity_id: c.campaignId,
      entity_name: c.campaignName,
      campaign_id: c.campaignId,
      campaign_name: c.campaignName,
      ad_group_id: null,
      current_value: c.dailyBudget,
      proposed_value: next,
      reason: `Averaging ${money(avgDailySpend)}/day against a ${money(c.dailyBudget)} budget at ${pct(a)} ACoS.`,
      source: 'rules',
      metrics: pick(c),
    })
  }

  return actions
}

// Ranks by spend so that, if we hit max_actions_per_run, the highest-impact changes win.
export function proposeActions(data: AccountData, s: OptimizerSettings): ProposedAction[] {
  return [
    ...bidRules(data.targets, s),
    ...searchTermRules(data, s),
    ...budgetRules(data.campaigns, s),
  ]
    .sort((a, b) => b.metrics.cost - a.metrics.cost)
    .slice(0, s.max_actions_per_run)
}

// Re-checks any action (including ones suggested by the AI reviewer) against
// the account data and guardrails. Returns the sanitised action or an error.
export function validateAction(
  action: ProposedAction,
  data: AccountData,
  s: OptimizerSettings
): { ok: true; action: ProposedAction } | { ok: false; error: string } {
  switch (action.type) {
    case 'update_bid': {
      const t = data.targets.find((x) => x.id === action.entity_id && x.kind === action.entity_kind)
      if (!t) return { ok: false, error: 'Unknown keyword/target' }
      if (action.proposed_value === null || !(action.proposed_value > 0)) {
        return { ok: false, error: 'Bid must be a positive number' }
      }
      const bid = clampBid(t.bid, action.proposed_value, s)
      if (bid === t.bid) return { ok: false, error: 'Bid unchanged after guardrails' }
      return { ok: true, action: { ...action, current_value: t.bid, proposed_value: bid } }
    }
    case 'pause_target': {
      const t = data.targets.find((x) => x.id === action.entity_id && x.kind === action.entity_kind)
      if (!t) return { ok: false, error: 'Unknown keyword/target' }
      return { ok: true, action: { ...action, proposed_value: null } }
    }
    case 'add_negative_keyword':
    case 'add_exact_keyword': {
      const term = action.entity_name.trim().toLowerCase()
      const st = data.searchTerms.find(
        (x) => x.adGroupId === action.ad_group_id && x.searchTerm.trim().toLowerCase() === term
      )
      if (!st) return { ok: false, error: 'Search term not found in that ad group' }
      if (isAsin(term)) return { ok: false, error: 'ASINs cannot be added as keywords' }
      if (action.type === 'add_exact_keyword') {
        if (!canHarvestFrom(st.matchType)) {
          return { ok: false, error: 'Exact keywords can only be added to broad/phrase keyword ad groups' }
        }
        const bid = round2(Math.min(Math.max(action.proposed_value ?? s.min_bid, s.min_bid), s.max_bid))
        return { ok: true, action: { ...action, entity_name: term, proposed_value: bid } }
      }
      return { ok: true, action: { ...action, entity_name: term, proposed_value: null } }
    }
    case 'update_budget': {
      const c = data.campaigns.find((x) => x.campaignId === action.entity_id)
      if (!c) return { ok: false, error: 'Unknown campaign' }
      if (action.proposed_value === null || !(action.proposed_value > 0)) {
        return { ok: false, error: 'Budget must be a positive number' }
      }
      // Budget moves are limited to one step either way per run.
      const hi = Math.min(c.dailyBudget * (1 + s.budget_increase_pct), s.max_daily_budget)
      const lo = Math.max(c.dailyBudget * (1 - s.budget_increase_pct), 1)
      const budget = round2(Math.min(Math.max(action.proposed_value, lo), Math.max(hi, lo)))
      if (budget === c.dailyBudget) return { ok: false, error: 'Budget unchanged after guardrails' }
      return { ok: true, action: { ...action, current_value: c.dailyBudget, proposed_value: budget } }
    }
    default:
      return { ok: false, error: 'Unsupported action type' }
  }
}
