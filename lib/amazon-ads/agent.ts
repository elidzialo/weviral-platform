import OpenAI from 'openai'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import {
  acos,
  round2,
  validateAction,
  type AccountData,
  type ActionType,
  type OptimizerSettings,
  type ProposedAction,
} from './optimizer'

// AI reviewer: takes the rule engine's proposals plus the account data, can
// drill into campaigns, then keeps, adjusts, drops or adds actions. Every
// change it makes is re-validated by validateAction, so it cannot exceed the
// guardrails in OptimizerSettings.

export interface AgentResult {
  actions: ProposedAction[]
  skipped: { action: ProposedAction; reason: string }[]
  summary: string
  insights: string[]
  model: string | null
}

const MODEL = 'gpt-4o'
const MAX_TURNS = 12

const SYSTEM_PROMPT = `You are an expert Amazon Sponsored Products PPC manager reviewing an automated optimisation run.

A deterministic rule engine has proposed changes. Your job:
1. Sanity-check each proposal. Drop ones that look wrong given context (e.g. a brand/defensive term, a target whose low sales are explained by tiny volume, or a negative keyword that would block a clearly relevant query). Use reject_action with a short reason.
2. Adjust bid/budget values when you have a better-justified number (modify_action). Guardrails will clamp extreme values.
3. Add a small number of high-confidence actions the rules missed (add_action) — only when the data clearly supports it.
4. Call finish with a concise plain-English summary for the seller and 3–6 specific insights.

Be conservative: wasted spend is bad, but so is cutting off traffic that converts. Use get_campaign_detail to look at data before making non-obvious decisions. Monetary values are in the account currency.`

const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_campaign_detail',
      description: 'Keyword/target and search-term performance for one campaign (top 40 each by spend).',
      parameters: {
        type: 'object',
        properties: { campaign_id: { type: 'string' } },
        required: ['campaign_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reject_action',
      description: 'Remove a proposed action from the plan.',
      parameters: {
        type: 'object',
        properties: { key: { type: 'string' }, reason: { type: 'string' } },
        required: ['key', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'modify_action',
      description: 'Change the proposed value (bid or daily budget) of an existing action.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          proposed_value: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['key', 'proposed_value', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_action',
      description:
        'Add an action. update_bid/pause_target need entity_kind (keyword|target) and entity_id. ' +
        'add_negative_keyword/add_exact_keyword need search_term and ad_group_id. update_budget needs campaign_id.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['update_bid', 'pause_target', 'add_negative_keyword', 'add_exact_keyword', 'update_budget'],
          },
          entity_kind: { type: 'string', enum: ['keyword', 'target'] },
          entity_id: { type: 'string' },
          search_term: { type: 'string' },
          ad_group_id: { type: 'string' },
          campaign_id: { type: 'string' },
          proposed_value: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['type', 'reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish',
      description: 'Finish the review.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          insights: { type: 'array', items: { type: 'string' } },
        },
        required: ['summary', 'insights'],
      },
    },
  },
]

function fmtAcos(m: { cost: number; sales: number }): string {
  const a = acos(m)
  return a === null ? '—' : `${Math.round(a * 100)}%`
}

function compactAction(a: ProposedAction) {
  return {
    key: a.key,
    type: a.type,
    entity: a.entity_name,
    campaign: a.campaign_name,
    current: a.current_value,
    proposed: a.proposed_value,
    clicks: a.metrics.clicks,
    spend: a.metrics.cost,
    sales: a.metrics.sales,
    orders: a.metrics.orders,
    reason: a.reason,
  }
}

function campaignDetail(data: AccountData, campaignId: string) {
  const bySpend = <T extends { cost: number }>(xs: T[]) => [...xs].sort((a, b) => b.cost - a.cost).slice(0, 40)
  return {
    targets: bySpend(data.targets.filter((t) => t.campaignId === campaignId)).map((t) => ({
      kind: t.kind,
      id: t.id,
      text: t.text,
      match: t.matchType,
      bid: t.bid,
      ad_group_id: t.adGroupId,
      clicks: t.clicks,
      spend: round2(t.cost),
      sales: round2(t.sales),
      orders: t.orders,
      acos: fmtAcos(t),
    })),
    search_terms: bySpend(data.searchTerms.filter((s) => s.campaignId === campaignId)).map((s) => ({
      term: s.searchTerm,
      ad_group_id: s.adGroupId,
      match: s.matchType,
      clicks: s.clicks,
      spend: round2(s.cost),
      sales: round2(s.sales),
      orders: s.orders,
      acos: fmtAcos(s),
    })),
  }
}

// Two actions on the same entity would conflict (e.g. a bid change and a pause).
function entityKey(a: ProposedAction): string {
  return a.entity_id ? `${a.entity_kind}:${a.entity_id}` : `${a.entity_kind}:${a.ad_group_id}:${a.entity_name}`
}

function buildAction(
  args: Record<string, unknown>,
  data: AccountData,
  n: number
): ProposedAction | string {
  const type = args.type as ActionType
  const reason = String(args.reason ?? '')
  const value = typeof args.proposed_value === 'number' ? args.proposed_value : null

  if (type === 'update_bid' || type === 'pause_target') {
    const t = data.targets.find((x) => x.id === args.entity_id && x.kind === args.entity_kind)
    if (!t) return 'Unknown keyword/target'
    return {
      key: `agent:${n}`, type, source: 'agent', reason,
      entity_kind: t.kind, entity_id: t.id, entity_name: `${t.text} (${t.matchType})`,
      campaign_id: t.campaignId, campaign_name: t.campaignName, ad_group_id: t.adGroupId,
      current_value: t.bid, proposed_value: type === 'update_bid' ? value : null,
      metrics: { impressions: t.impressions, clicks: t.clicks, cost: t.cost, sales: t.sales, orders: t.orders },
    }
  }
  if (type === 'add_negative_keyword' || type === 'add_exact_keyword') {
    const term = String(args.search_term ?? '').trim().toLowerCase()
    const st = data.searchTerms.find(
      (x) => x.adGroupId === args.ad_group_id && x.searchTerm.trim().toLowerCase() === term
    )
    if (!st) return 'Search term not found in that ad group'
    return {
      key: `agent:${n}`, type, source: 'agent', reason,
      entity_kind: 'search_term', entity_id: null, entity_name: term,
      campaign_id: st.campaignId, campaign_name: st.campaignName, ad_group_id: st.adGroupId,
      current_value: null, proposed_value: value,
      metrics: { impressions: st.impressions, clicks: st.clicks, cost: st.cost, sales: st.sales, orders: st.orders },
    }
  }
  if (type === 'update_budget') {
    const c = data.campaigns.find((x) => x.campaignId === args.campaign_id)
    if (!c) return 'Unknown campaign'
    return {
      key: `agent:${n}`, type, source: 'agent', reason,
      entity_kind: 'campaign', entity_id: c.campaignId, entity_name: c.campaignName,
      campaign_id: c.campaignId, campaign_name: c.campaignName, ad_group_id: null,
      current_value: c.dailyBudget, proposed_value: value,
      metrics: { impressions: c.impressions, clicks: c.clicks, cost: c.cost, sales: c.sales, orders: c.orders },
    }
  }
  return 'Unsupported action type'
}

export function fallbackSummary(data: AccountData, actions: ProposedAction[], s: OptimizerSettings): string {
  const totals = data.campaigns.reduce(
    (t, c) => ({ cost: t.cost + c.cost, sales: t.sales + c.sales }),
    { cost: 0, sales: 0 }
  )
  const count = (type: ActionType) => actions.filter((a) => a.type === type).length
  return (
    `Last ${s.lookback_days} days: ${totals.cost.toFixed(2)} spend, ${totals.sales.toFixed(2)} sales, ` +
    `ACoS ${fmtAcos(totals)} (target ${Math.round(s.target_acos * 100)}%). ` +
    `Proposed ${count('update_bid')} bid changes, ${count('pause_target')} pauses, ` +
    `${count('add_negative_keyword')} negative keywords, ${count('add_exact_keyword')} new exact keywords ` +
    `and ${count('update_budget')} budget increases.`
  )
}

export async function reviewWithAgent(
  data: AccountData,
  proposals: ProposedAction[],
  settings: OptimizerSettings
): Promise<AgentResult> {
  const plan = new Map(proposals.map((a) => [a.key, a]))
  const skipped: AgentResult['skipped'] = []

  if (!process.env.OPENAI_API_KEY) {
    return {
      actions: proposals,
      skipped,
      summary: fallbackSummary(data, proposals, settings),
      insights: [],
      model: null,
    }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const campaigns = [...data.campaigns]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 50)
    .map((c) => ({
      id: c.campaignId,
      name: c.campaignName,
      status: c.status,
      daily_budget: c.dailyBudget,
      spend: round2(c.cost),
      sales: round2(c.sales),
      orders: c.orders,
      clicks: c.clicks,
      acos: fmtAcos(c),
    }))

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: JSON.stringify({
        settings,
        campaigns,
        proposed_actions: proposals.map(compactAction),
      }),
    },
  ]

  let added = 0
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'required',
      temperature: 0.2,
    })
    const msg = completion.choices[0].message
    messages.push(msg)
    const calls = msg.tool_calls ?? []
    if (calls.length === 0) break

    for (const call of calls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(call.function.arguments || '{}')
      } catch {
        // fall through with empty args; the tool will report the error
      }
      let result: unknown

      switch (call.function.name) {
        case 'get_campaign_detail':
          result = campaignDetail(data, String(args.campaign_id))
          break
        case 'reject_action': {
          const a = plan.get(String(args.key))
          if (!a) { result = { error: 'Unknown key' }; break }
          plan.delete(a.key)
          skipped.push({ action: a, reason: String(args.reason ?? '') })
          result = { ok: true }
          break
        }
        case 'modify_action': {
          const a = plan.get(String(args.key))
          if (!a) { result = { error: 'Unknown key' }; break }
          const v = validateAction({ ...a, proposed_value: Number(args.proposed_value) }, data, settings)
          if (!v.ok) { result = { error: v.error }; break }
          plan.set(a.key, { ...v.action, reason: `${a.reason} Reviewer: ${args.reason}` })
          result = { ok: true, proposed_value: v.action.proposed_value }
          break
        }
        case 'add_action': {
          const built = buildAction(args, data, ++added)
          if (typeof built === 'string') { result = { error: built }; break }
          const v = validateAction(built, data, settings)
          if (!v.ok) { result = { error: v.error }; break }
          if (plan.size >= settings.max_actions_per_run) { result = { error: 'Action limit reached' }; break }
          const existing = Array.from(plan.values()).find((p) => entityKey(p) === entityKey(v.action))
          if (existing) { result = { error: `Already covered by ${existing.key}; use modify_action or reject_action` }; break }
          plan.set(v.action.key, v.action)
          result = { ok: true, key: v.action.key, proposed_value: v.action.proposed_value }
          break
        }
        case 'finish':
          return {
            actions: Array.from(plan.values()),
            skipped,
            summary: String(args.summary ?? ''),
            insights: Array.isArray(args.insights) ? args.insights.map(String) : [],
            model: MODEL,
          }
        default:
          result = { error: 'Unknown tool' }
      }

      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
    }
  }

  // Ran out of turns without finishing — keep whatever the reviewer decided so far.
  const actions = Array.from(plan.values())
  return { actions, skipped, summary: fallbackSummary(data, actions, settings), insights: [], model: MODEL }
}
