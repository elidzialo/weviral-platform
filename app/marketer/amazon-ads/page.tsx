'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';

interface Settings {
  target_acos: number;
  lookback_days: number;
  min_clicks: number;
  max_bid_change_pct: number;
  min_bid: number;
  max_bid: number;
  harvest_min_orders: number;
  budget_increase_pct: number;
  max_daily_budget: number;
  max_actions_per_run: number;
}

interface Profile {
  profileId: string;
  countryCode: string;
  currencyCode: string;
  name: string;
  type?: string;
}

interface Connection {
  region: 'NA' | 'EU' | 'FE';
  profile_id: string | null;
  profiles: Profile[];
  settings: Settings;
  auto_apply: boolean;
  schedule_enabled: boolean;
}

interface Totals {
  spend: number;
  sales: number;
  orders: number;
  clicks: number;
  impressions: number;
  acos: number | null;
}

interface Run {
  id: string;
  status: 'reports_pending' | 'awaiting_approval' | 'completed' | 'failed';
  trigger: 'manual' | 'scheduled';
  date_start: string;
  date_end: string;
  totals: Totals | null;
  summary: string | null;
  insights?: string[];
  error: string | null;
  created_at: string;
}

interface Action {
  id: string;
  type: 'update_bid' | 'pause_target' | 'add_negative_keyword' | 'add_exact_keyword' | 'update_budget';
  entity_kind: string;
  entity_name: string;
  campaign_name: string;
  current_value: number | null;
  proposed_value: number | null;
  reason: string;
  source: 'rules' | 'agent';
  metrics: { clicks: number; cost: number; sales: number; orders: number };
  status: 'proposed' | 'applied' | 'failed' | 'rejected' | 'skipped';
  error: string | null;
}

const ACTION_LABELS: Record<Action['type'], string> = {
  update_bid: 'Change bid',
  pause_target: 'Pause',
  add_negative_keyword: 'Add negative',
  add_exact_keyword: 'Add exact keyword',
  update_budget: 'Change budget',
};

const RUN_STATUS: Record<Run['status'], { variant: 'amber' | 'purple' | 'green' | 'red'; label: string }> = {
  reports_pending: { variant: 'amber', label: 'Fetching reports' },
  awaiting_approval: { variant: 'purple', label: 'Needs approval' },
  completed: { variant: 'green', label: 'Completed' },
  failed: { variant: 'red', label: 'Failed' },
};

const REGIONS = [
  { value: 'EU', label: 'Europe (UK, DE, FR, IT, ES, NL, SE, PL, TR, AE, SA, IN, EG)' },
  { value: 'NA', label: 'North America (US, CA, MX, BR)' },
  { value: 'FE', label: 'Far East (JP, AU, SG)' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pct(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : `${Math.round(n * 100)}%`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}

// useSearchParams needs a Suspense boundary in the App Router.
export default function AmazonAdsPage() {
  return (
    <Suspense fallback={null}>
      <AmazonAdsAgent />
    </Suspense>
  );
}

function AmazonAdsAgent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [region, setRegion] = useState('EU');
  const [draft, setDraft] = useState<Settings | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [notice, setNotice] = useState<string | null>(
    searchParams.get('connected') ? 'Amazon Ads account connected.' : null
  );

  const currency = useMemo(() => {
    const p = connection?.profiles.find((x) => x.profileId === connection.profile_id);
    return p?.currencyCode ?? 'GBP';
  }, [connection]);

  const money = useCallback(
    (n: number | null | undefined) =>
      n === null || n === undefined
        ? '—'
        : new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n),
    [currency]
  );

  const loadConnection = useCallback(async () => {
    const res = await api<{ configured: boolean; connection: Connection | null }>('/api/amazon-ads/connection');
    setConfigured(res.configured);
    setConnection(res.connection);
    setDraft(res.connection?.settings ?? null);
    return res.connection;
  }, []);

  const loadRuns = useCallback(async () => {
    const res = await api<{ runs: Run[] }>('/api/amazon-ads/runs');
    setRuns(res.runs);
    setSelectedRunId((cur) => cur ?? res.runs[0]?.id ?? null);
  }, []);

  const loadRun = useCallback(async (id: string) => {
    const res = await api<{ run: Run; actions: Action[] }>(`/api/amazon-ads/runs/${id}`);
    setRun(res.run);
    setActions(res.actions);
    setSelected(new Set(res.actions.filter((a) => a.status === 'proposed').map((a) => a.id)));
    setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, ...res.run } : r)));
    return res.run;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const conn = await loadConnection();
        if (conn) await loadRuns();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadConnection, loadRuns]);

  useEffect(() => {
    if (selectedRunId) loadRun(selectedRunId).catch((e) => setError(e.message));
  }, [selectedRunId, loadRun]);

  // Amazon builds reports asynchronously; each poll lets the server advance the run.
  useEffect(() => {
    if (!run || run.status !== 'reports_pending') return;
    const t = setTimeout(() => loadRun(run.id).catch(() => {}), 20000);
    return () => clearTimeout(t);
  }, [run, loadRun]);

  async function withBusy(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  const startRun = () =>
    withBusy('run', async () => {
      const res = await api<{ run: Run }>('/api/amazon-ads/runs', { method: 'POST' });
      setRuns((rs) => [res.run, ...rs]);
      setSelectedRunId(res.run.id);
      setNotice('Reports requested from Amazon. This usually takes a few minutes — you can leave this page.');
    });

  const saveSettings = (patch: Record<string, unknown>) =>
    withBusy('settings', async () => {
      await api('/api/amazon-ads/connection', { method: 'PATCH', body: JSON.stringify(patch) });
      await loadConnection();
      setNotice('Settings saved.');
    });

  const disconnect = () =>
    withBusy('disconnect', async () => {
      if (!confirm('Disconnect your Amazon Ads account? Run history is kept.')) return;
      await api('/api/amazon-ads/connection', { method: 'DELETE' });
      setConnection(null);
      setRuns([]);
      setRun(null);
      setSelectedRunId(null);
    });

  const decide = (approve: boolean) =>
    withBusy(approve ? 'approve' : 'reject', async () => {
      if (!run) return;
      const ids = Array.from(selected);
      if (approve && !confirm(`Push ${ids.length} change(s) to your live Amazon campaigns?`)) return;
      const res = await api<{ applied: number; failed: number; rejected: number }>(
        `/api/amazon-ads/runs/${run.id}/actions`,
        { method: 'POST', body: JSON.stringify(approve ? { approve: ids } : { reject: ids }) }
      );
      await loadRun(run.id);
      setNotice(
        approve
          ? `${res.applied} change(s) applied${res.failed ? `, ${res.failed} failed` : ''}.`
          : `${res.rejected} change(s) dismissed.`
      );
    });

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const proposed = actions.filter((a) => a.status === 'proposed');
  const decided = actions.filter((a) => a.status !== 'proposed');

  function describeChange(a: Action): string {
    if (a.type === 'update_bid' || a.type === 'update_budget') {
      return `${money(a.current_value)} → ${money(a.proposed_value)}`;
    }
    if (a.type === 'add_exact_keyword') return `Bid ${money(a.proposed_value)}`;
    if (a.type === 'add_negative_keyword') return 'Negative exact';
    return 'Paused';
  }

  function settingInput(key: keyof Settings, label: string, opts: { percent?: boolean; step?: number; hint?: string } = {}) {
    if (!draft) return null;
    const value = opts.percent ? Math.round(draft[key] * 100) : draft[key];
    return (
      <label className="block">
        <span className="block text-[13px] font-medium text-[#0B0B0C] mb-1">{label}</span>
        <div className="relative">
          <input
            type="number"
            step={opts.step ?? 1}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              setDraft({ ...draft, [key]: opts.percent ? n / 100 : n });
            }}
            className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] bg-white text-sm text-[#0B0B0C] focus:outline-none focus:ring-2 focus:ring-[#6E5BFF]/30"
          />
          {opts.percent && <span className="absolute right-3 top-2 text-sm text-[#8C8C88]">%</span>}
        </div>
        {opts.hint && <span className="block text-xs text-[#8C8C88] mt-1">{opts.hint}</span>}
      </label>
    );
  }

  if (loading) {
    return (
      <>
        <Topbar title="Amazon Ads Agent" subtitle="AI optimisation for Sponsored Products" />
        <div className="p-8 text-sm text-[#8C8C88]">Loading…</div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Amazon Ads Agent" subtitle="AI optimisation for Sponsored Products">
        {connection && (
          <Button onClick={startRun} loading={busy === 'run'} disabled={!connection.profile_id || run?.status === 'reports_pending'}>
            Run optimisation
          </Button>
        )}
      </Topbar>

      <div className="p-4 sm:p-8 space-y-6 max-w-6xl">
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm bg-[rgba(239,68,68,.08)] text-[#991B1B] border border-[rgba(239,68,68,.2)]">
            {error}
          </div>
        )}
        {notice && (
          <div className="px-4 py-3 rounded-xl text-sm bg-[rgba(31,211,163,.1)] text-[#0F7A5A] border border-[rgba(31,211,163,.25)]">
            {notice}
          </div>
        )}

        {!configured && (
          <Card>
            <CardBody className="text-sm text-[#0B0B0C] space-y-2">
              <p className="font-semibold">Amazon Ads API credentials are not configured.</p>
              <p className="text-[#8C8C88]">
                Set <code>AMAZON_ADS_CLIENT_ID</code> and <code>AMAZON_ADS_CLIENT_SECRET</code> from your Amazon Ads API
                application, and add <code>{'{APP_URL}'}/api/amazon-ads/callback</code> as an allowed return URL.
              </p>
            </CardBody>
          </Card>
        )}

        {!connection ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect your Amazon Ads account</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm text-[#8C8C88] max-w-2xl">
                The agent reviews your Sponsored Products performance each day and proposes bid changes, negative
                keywords, new exact-match keywords and budget increases to hit your target ACoS. Nothing changes in
                your account until you approve it (unless you turn on auto-apply).
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <label className="block flex-1 max-w-md">
                  <span className="block text-[13px] font-medium text-[#0B0B0C] mb-1">Marketplace region</span>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] bg-white text-sm"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <Button
                  disabled={!configured}
                  onClick={() => { window.location.href = `/api/amazon-ads/connect?region=${region}`; }}
                >
                  Connect with Amazon
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            {run && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle>
                      Run · {formatDate(run.date_start)} – {formatDate(run.date_end)}
                    </CardTitle>
                    <Badge variant={RUN_STATUS[run.status].variant}>{RUN_STATUS[run.status].label}</Badge>
                  </div>
                  <span className="text-xs text-[#8C8C88]">{run.trigger === 'scheduled' ? 'Scheduled' : 'Manual'}</span>
                </CardHeader>
                <CardBody className="space-y-5">
                  {run.status === 'reports_pending' && (
                    <p className="text-sm text-[#8C8C88]">
                      Waiting for Amazon to build the performance reports. This page checks every 20 seconds.
                    </p>
                  )}
                  {run.status === 'failed' && <p className="text-sm text-[#991B1B]">{run.error}</p>}

                  {run.totals && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard label="Spend" value={money(run.totals.spend)} />
                      <StatCard label="Sales" value={money(run.totals.sales)} sub={`${run.totals.orders} orders`} />
                      <StatCard label="ACoS" value={pct(run.totals.acos)} sub={`Target ${pct(connection.settings.target_acos)}`} />
                      <StatCard
                        label="ROAS"
                        value={run.totals.spend > 0 ? (run.totals.sales / run.totals.spend).toFixed(2) : '—'}
                        sub={`${run.totals.clicks.toLocaleString('en-GB')} clicks`}
                      />
                    </div>
                  )}

                  {run.summary && (
                    <div className="rounded-xl bg-[#F6F6F3] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8C88] mb-1">Agent summary</p>
                      <p className="text-sm text-[#0B0B0C] whitespace-pre-line">{run.summary}</p>
                      {run.insights && run.insights.length > 0 && (
                        <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-[#0B0B0C]">
                          {run.insights.map((i, n) => <li key={n}>{i}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {proposed.length > 0 && run && (
              <Card>
                <CardHeader>
                  <CardTitle>Proposed changes ({proposed.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => decide(false)} loading={busy === 'reject'} disabled={!selected.size || !!busy}>
                      Dismiss selected
                    </Button>
                    <Button size="sm" onClick={() => decide(true)} loading={busy === 'approve'} disabled={!selected.size || !!busy}>
                      Apply {selected.size} to Amazon
                    </Button>
                  </div>
                </CardHeader>
                <ActionTable actions={proposed} selected={selected} onToggle={toggle} describe={describeChange} money={money}
                  onToggleAll={(all) => setSelected(all ? new Set(proposed.map((a) => a.id)) : new Set())} />
              </Card>
            )}

            {decided.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Change log</CardTitle>
                </CardHeader>
                <ActionTable actions={decided} describe={describeChange} money={money} />
              </Card>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Agent settings</CardTitle>
                </CardHeader>
                <CardBody className="space-y-5">
                  <label className="block max-w-md">
                    <span className="block text-[13px] font-medium text-[#0B0B0C] mb-1">Advertising profile</span>
                    <select
                      value={connection.profile_id ?? ''}
                      onChange={(e) => saveSettings({ profile_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#ECECE8] bg-white text-sm"
                    >
                      {connection.profiles.map((p) => (
                        <option key={p.profileId} value={p.profileId}>
                          {p.name} · {p.countryCode} ({p.type})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {settingInput('target_acos', 'Target ACoS', { percent: true, hint: 'Bids are steered towards this' })}
                    {settingInput('lookback_days', 'Lookback window (days)', { hint: '7–60 days' })}
                    {settingInput('min_clicks', 'Min clicks before acting', { hint: 'Avoids reacting to noise' })}
                    {settingInput('max_bid_change_pct', 'Max bid change per run', { percent: true })}
                    {settingInput('min_bid', `Min bid (${currency})`, { step: 0.01 })}
                    {settingInput('max_bid', `Max bid (${currency})`, { step: 0.01 })}
                    {settingInput('harvest_min_orders', 'Orders to promote a search term')}
                    {settingInput('budget_increase_pct', 'Budget step', { percent: true })}
                    {settingInput('max_daily_budget', `Max daily budget (${currency})`, { step: 1 })}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => saveSettings({ settings: draft })} loading={busy === 'settings'}>
                      Save settings
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Automation</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <Toggle
                      label="Daily run"
                      hint="Analyse the account every morning."
                      checked={connection.schedule_enabled}
                      onChange={(v) => saveSettings({ schedule_enabled: v })}
                    />
                    <Toggle
                      label="Auto-apply changes"
                      hint="Push changes without approval. Guardrails above still apply."
                      checked={connection.auto_apply}
                      onChange={(v) => {
                        if (v && !confirm('Let the agent change your live Amazon campaigns without asking?')) return;
                        saveSettings({ auto_apply: v });
                      }}
                    />
                    <button type="button" onClick={disconnect} className="text-sm text-[#991B1B] hover:underline">
                      Disconnect Amazon Ads
                    </button>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Run history</CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-[#ECECE8]">
                    {runs.length === 0 && <p className="px-6 py-4 text-sm text-[#8C8C88]">No runs yet.</p>}
                    {runs.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRunId(r.id)}
                        className={[
                          'w-full flex items-center justify-between px-6 py-3 text-left text-sm hover:bg-[#F6F6F3]',
                          r.id === selectedRunId ? 'bg-[rgba(110,91,255,0.06)]' : '',
                        ].join(' ')}
                      >
                        <span className="text-[#0B0B0C]">{formatDate(r.created_at)}</span>
                        <Badge variant={RUN_STATUS[r.status].variant}>{RUN_STATUS[r.status].label}</Badge>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <span>
        <span className="block text-sm font-medium text-[#0B0B0C]">{label}</span>
        <span className="block text-xs text-[#8C8C88]">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-[#6E5BFF]" />
    </label>
  );
}

function ActionTable({
  actions,
  selected,
  onToggle,
  onToggleAll,
  describe,
  money,
}: {
  actions: Action[];
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: (all: boolean) => void;
  describe: (a: Action) => string;
  money: (n: number) => string;
}) {
  const selectable = Boolean(selected && onToggle);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-[#8C8C88] border-b border-[#ECECE8]">
            {selectable && (
              <th className="pl-6 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selected!.size === actions.length}
                  onChange={(e) => onToggleAll?.(e.target.checked)}
                  className="accent-[#6E5BFF]"
                />
              </th>
            )}
            <th className={['py-3 pr-4', selectable ? '' : 'pl-6'].join(' ')}>Action</th>
            <th className="py-3 pr-4">Target / term</th>
            <th className="py-3 pr-4">Change</th>
            <th className="py-3 pr-4 text-right">Clicks</th>
            <th className="py-3 pr-4 text-right">Spend</th>
            <th className="py-3 pr-4 text-right">Sales</th>
            <th className="py-3 pr-6">Why</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ECECE8]">
          {actions.map((a) => (
            <tr key={a.id} className="align-top">
              {selectable && (
                <td className="pl-6 py-3">
                  <input type="checkbox" checked={selected!.has(a.id)} onChange={() => onToggle!(a.id)} className="accent-[#6E5BFF]" />
                </td>
              )}
              <td className={['py-3 pr-4 whitespace-nowrap', selectable ? '' : 'pl-6'].join(' ')}>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-[#0B0B0C]">{ACTION_LABELS[a.type]}</span>
                  <span className="flex gap-1">
                    {a.status !== 'proposed' && statusBadge(a.status)}
                    {a.source === 'agent' && <Badge variant="purple">AI</Badge>}
                  </span>
                </div>
              </td>
              <td className="py-3 pr-4">
                <div className="text-[#0B0B0C] break-words max-w-[240px]">{a.entity_name}</div>
                <div className="text-xs text-[#8C8C88] truncate max-w-[240px]">{a.campaign_name}</div>
              </td>
              <td className="py-3 pr-4 whitespace-nowrap text-[#0B0B0C]">{describe(a)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{a.metrics.clicks}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{money(a.metrics.cost)}</td>
              <td className="py-3 pr-4 text-right tabular-nums">{money(a.metrics.sales)}</td>
              <td className="py-3 pr-6 text-[#8C8C88] min-w-[220px]">
                {a.reason}
                {a.error && <div className="text-[#991B1B] mt-1">{a.error}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
