// Run with: npm test  (Node's built-in test runner with type stripping)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SETTINGS,
  bidRules,
  budgetRules,
  clampBid,
  proposeActions,
  resolveSettings,
  searchTermRules,
  validateAction,
  type AccountData,
  type TargetPerf,
} from '../lib/amazon-ads/optimizer.ts'
import { parseReports } from '../lib/amazon-ads/reports.ts'

const s = DEFAULT_SETTINGS

function target(overrides: Partial<TargetPerf> = {}): TargetPerf {
  return {
    id: 'k1', kind: 'keyword', text: 'yoga mat', matchType: 'BROAD', bid: 1,
    campaignId: 'c1', campaignName: 'Mats', adGroupId: 'ag1',
    impressions: 1000, clicks: 20, cost: 20, sales: 100, orders: 4,
    ...overrides,
  }
}

function account(overrides: Partial<AccountData> = {}): AccountData {
  return { campaigns: [], targets: [], searchTerms: [], ...overrides }
}

test('clampBid limits a single move to max_bid_change_pct and the min/max bid', () => {
  assert.equal(clampBid(1, 3, s), 1.2)
  assert.equal(clampBid(1, 0.1, s), 0.8)
  assert.equal(clampBid(4.9, 10, s), 5)
  assert.equal(clampBid(0.11, 0.01, s), 0.1)
})

test('bid rules ignore targets below the click threshold', () => {
  assert.deepEqual(bidRules([target({ clicks: 5, orders: 0, sales: 0 })], s), [])
})

test('bid rules raise bids when ACoS is well under target', () => {
  // ACoS 10% vs 30% target → wants 3x, capped at +20%
  const [a] = bidRules([target({ cost: 10, sales: 100 })], s)
  assert.equal(a.type, 'update_bid')
  assert.equal(a.proposed_value, 1.2)
})

test('bid rules lower bids when ACoS is over target', () => {
  // ACoS 60% vs 30% target → wants 0.5x, capped at -20%
  const [a] = bidRules([target({ cost: 60, sales: 100 })], s)
  assert.equal(a.proposed_value, 0.8)
})

test('bid rules leave on-target bids alone', () => {
  assert.deepEqual(bidRules([target({ cost: 30, sales: 100 })], s), [])
})

test('zero-order targets get a bid cut, then a pause at twice the click threshold', () => {
  const [cut] = bidRules([target({ clicks: 20, orders: 0, sales: 0 })], s)
  assert.equal(cut.type, 'update_bid')
  assert.equal(cut.proposed_value, 0.8)
  const [pause] = bidRules([target({ clicks: 30, orders: 0, sales: 0 })], s)
  assert.equal(pause.type, 'pause_target')
})

test('search terms: negate wasteful ones, harvest converting ones, skip ASINs and duplicates', () => {
  const base = { campaignId: 'c1', campaignName: 'Broad', adGroupId: 'ag1', matchType: 'BROAD', impressions: 500 }
  const data = account({
    targets: [target({ matchType: 'EXACT', text: 'cork yoga mat' })],
    searchTerms: [
      { ...base, searchTerm: 'free yoga videos', clicks: 18, cost: 9, sales: 0, orders: 0 },
      { ...base, searchTerm: 'thick yoga mat', clicks: 30, cost: 15, sales: 120, orders: 3 },
      { ...base, searchTerm: 'cork yoga mat', clicks: 30, cost: 15, sales: 120, orders: 3 },
      { ...base, searchTerm: 'b0abcdefgh', clicks: 40, cost: 20, sales: 0, orders: 0 },
    ],
  })
  const actions = searchTermRules(data, s)
  assert.deepEqual(
    actions.map((a) => [a.type, a.entity_name]),
    [
      ['add_negative_keyword', 'free yoga videos'],
      ['add_exact_keyword', 'thick yoga mat'],
    ]
  )
  assert.equal(actions[1].proposed_value, 0.5) // harvested at observed CPC
})

test('converting search terms from auto campaigns are not harvested (Amazon rejects keywords there)', () => {
  const data = account({
    searchTerms: [{
      searchTerm: 'thick yoga mat', campaignId: 'c2', campaignName: 'Auto', adGroupId: 'ag2',
      matchType: 'TARGETING_EXPRESSION_PREDEFINED', impressions: 500, clicks: 30, cost: 15, sales: 120, orders: 3,
    }],
  })
  assert.deepEqual(searchTermRules(data, s), [])
})

test('budget rules only raise budgets for capped, profitable campaigns', () => {
  const c = { campaignId: 'c1', campaignName: 'Mats', status: 'ENABLED', dailyBudget: 10, impressions: 0, clicks: 100 }
  // 14 days × 9.5/day = 133 spend at 13% ACoS → capped and profitable
  const [a] = budgetRules([{ ...c, cost: 133, sales: 1000, orders: 30 }], s)
  assert.equal(a.proposed_value, 12)
  // Not capped
  assert.deepEqual(budgetRules([{ ...c, cost: 50, sales: 1000, orders: 30 }], s), [])
  // Capped but unprofitable
  assert.deepEqual(budgetRules([{ ...c, cost: 133, sales: 200, orders: 5 }], s), [])
})

test('proposeActions caps the number of actions, keeping the highest spend', () => {
  const targets = Array.from({ length: 5 }, (_, i) => target({ id: `k${i}`, cost: 10 + i, sales: 100 }))
  const out = proposeActions(account({ targets }), { ...s, max_actions_per_run: 2 })
  assert.deepEqual(out.map((a) => a.entity_id), ['k4', 'k3'])
})

test('validateAction clamps AI-suggested bids and rejects unknown entities', () => {
  const data = account({ targets: [target()] })
  const [a] = bidRules([target({ cost: 10, sales: 100 })], s)
  const v = validateAction({ ...a, proposed_value: 50 }, data, s)
  assert.ok(v.ok)
  assert.equal(v.ok && v.action.proposed_value, 1.2)
  assert.equal(validateAction({ ...a, entity_id: 'nope' }, data, s).ok, false)
})

test('resolveSettings clamps and fills defaults', () => {
  const r = resolveSettings({ target_acos: 5, lookback_days: 'x', min_bid: 2, max_bid: 1 })
  assert.equal(r.target_acos, 1.5)
  assert.equal(r.lookback_days, DEFAULT_SETTINGS.lookback_days)
  assert.equal(r.max_bid, 2)
})

test('parseReports maps keyword vs target rows and merges duplicate search terms', () => {
  const data = parseReports({
    campaigns: [{ campaignId: '1', campaignName: 'A', campaignStatus: 'enabled', campaignBudgetAmount: 20, cost: 5, sales7d: 10, purchases7d: 1, clicks: 3, impressions: 9 }],
    targeting: [
      { campaignId: '1', adGroupId: '2', keywordId: '3', keyword: 'yoga mat', matchType: 'EXACT', keywordBid: 0.9, clicks: 1 },
      { campaignId: '1', adGroupId: '2', keywordId: '4', targeting: 'close-match', matchType: 'TARGETING_EXPRESSION_PREDEFINED', keywordBid: 0.5 },
    ],
    searchTerms: [
      { campaignId: '1', adGroupId: '2', searchTerm: 'Yoga Mat ', matchType: 'EXACT', clicks: 2, cost: 1 },
      { campaignId: '1', adGroupId: '2', searchTerm: 'yoga mat', matchType: 'BROAD', clicks: 3, cost: 2 },
    ],
  })
  assert.equal(data.campaigns[0].status, 'ENABLED')
  assert.deepEqual(data.targets.map((t) => [t.kind, t.text]), [['keyword', 'yoga mat'], ['target', 'close-match']])
  assert.equal(data.searchTerms.length, 1)
  assert.equal(data.searchTerms[0].clicks, 5)
  assert.equal(data.searchTerms[0].matchType, 'BROAD')
})
