import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import BarChart from '@/components/ui/BarChart';

interface Tier {
  id: string;
  name: string;
  views_target: number;
  influencer_payout: number;
  platform_fee: number;
  total_charge: number;
}

interface Application {
  id: string;
  status: string;
  proof_submissions: ProofSubmission[];
}

interface ProofSubmission {
  ai_view_count: number;
  status: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  tiers: Tier | null;
  applications: Application[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(amount);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return new Intl.NumberFormat('en-GB').format(n);
}

function getTierBadgeVariant(name: string): 'green' | 'purple' | 'amber' | 'gray' {
  const map: Record<string, 'green' | 'purple' | 'amber' | 'gray'> = {
    Starter: 'gray', Growth: 'amber', Viral: 'purple', Elite: 'green',
  };
  return map[name] ?? 'gray';
}

function getCampaignVerifiedViews(campaign: Campaign): number {
  let total = 0;
  for (const app of campaign.applications) {
    for (const proof of app.proof_submissions) {
      if (proof.status === 'approved') total += proof.ai_view_count;
    }
  }
  return total;
}

function hasPendingProof(campaign: Campaign): boolean {
  return campaign.applications.some((app) =>
    app.proof_submissions.some((p) => p.status === 'pending')
  );
}

export default async function MarketerDashboardPage() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select(`id,title,description,status,created_at,tiers(id,name,views_target,influencer_payout,platform_fee,total_charge),applications(id,status,proof_submissions(ai_view_count,status))`)
    .eq('marketer_id', user.id)
    .order('created_at', { ascending: false });

  if (campaignsError) console.error('MarketerDashboard campaigns error:', campaignsError);

  const allCampaigns: Campaign[] = (campaigns as Campaign[]) ?? [];
  const totalCampaigns = allCampaigns.length;

  let totalVerifiedViews = 0;
  let totalSpent = 0;

  for (const campaign of allCampaigns) {
    totalVerifiedViews += getCampaignVerifiedViews(campaign);
    if (campaign.status === 'active' || campaign.status === 'completed') {
      totalSpent += campaign.tiers?.total_charge ?? 0;
    }
  }

  const avgCostPerView = totalVerifiedViews > 0 ? totalSpent / totalVerifiedViews : 0;
  const activeCampaigns = allCampaigns.filter((c) => c.status === 'active').length;

  // Weekly spend distribution for chart
  const chartData = [
    { label: 'Mon', value: totalSpent * 0.12 },
    { label: 'Tue', value: totalSpent * 0.16 },
    { label: 'Wed', value: totalSpent * 0.20 },
    { label: 'Thu', value: totalSpent * 0.14 },
    { label: 'Fri', value: totalSpent * 0.22 },
    { label: 'Sat', value: totalSpent * 0.10 },
    { label: 'Sun', value: totalSpent * 0.06 },
  ];

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <div
        className="sticky top-0 z-10 px-8 py-4 border-b border-[#ECECE8]"
        style={{ background: 'rgba(246,246,243,.85)', backdropFilter: 'blur(14px)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#0B0B0C] leading-tight">Dashboard</h1>
            <p className="text-[13px] text-[#8C8C88]">Campaigns &amp; performance overview</p>
          </div>
          <Link
            href="/marketer/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #6E5BFF, #4D7CFF)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </Link>
        </div>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Reach"
            value={formatNumber(totalVerifiedViews)}
            sub="Verified views"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          />
          <StatCard
            label="Total Spend"
            value={formatCurrency(totalSpent)}
            sub="Escrow deposits"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18v11H3zM16 13h3M3 8l2.5-3h13L21 8" />
              </svg>
            }
          />
          <StatCard
            label="Active Ads"
            value={activeCampaigns}
            sub={`${totalCampaigns} total campaigns`}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            }
          />
          <StatCard
            label="Cost Per View"
            value={totalVerifiedViews > 0 ? formatCurrency(avgCostPerView) : '—'}
            sub="Based on verified views"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        </div>

        {/* Chart + Campaign panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
          <BarChart
            data={chartData}
            title="Spend by Day"
            subtitle="Weekly spend distribution"
            formatValue={formatCurrency}
          />

          {/* Campaign progress panel */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Progress</CardTitle>
              <Link href="/marketer/campaigns" className="text-[13px] font-semibold" style={{ color: '#6E5BFF' }}>
                View all →
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {allCampaigns.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-[#8C8C88]">No campaigns yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#ECECE8]">
                  {allCampaigns.slice(0, 5).map((campaign) => {
                    const verified = getCampaignVerifiedViews(campaign);
                    const target = campaign.tiers?.views_target ?? 0;
                    const pct = target > 0 ? Math.min(100, (verified / target) * 100) : 0;
                    return (
                      <li key={campaign.id} className="px-5 py-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[13px] font-medium text-[#0B0B0C] truncate flex-1 mr-2">
                            {campaign.title}
                          </p>
                          <span className="text-[11px] font-mono text-[#8C8C88] flex-shrink-0">
                            {Math.round(pct)}%
                          </span>
                        </div>
                        <div className="w-full bg-[#ECECE8] rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #6E5BFF, #1FD3A3)',
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-[#8C8C88] mt-1">
                          {formatNumber(verified)} / {formatNumber(target)} views
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Campaigns table */}
        <Card>
          <CardHeader>
            <CardTitle>My Campaigns</CardTitle>
            <span className="text-[13px] text-[#8C8C88]">{totalCampaigns} campaign{totalCampaigns !== 1 ? 's' : ''}</span>
          </CardHeader>
          {allCampaigns.length === 0 ? (
            <CardBody>
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(110,91,255,0.08)', color: '#6E5BFF' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#0B0B0C]">No campaigns yet</p>
                <p className="text-sm text-[#8C8C88]">Launch your first campaign to start getting verified views.</p>
                <Link
                  href="/marketer/create"
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(90deg, #6E5BFF, #4D7CFF)' }}
                >
                  Create Campaign
                </Link>
              </div>
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ECECE8]">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Influencers</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Verified Views</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECECE8]">
                  {allCampaigns.map((campaign) => {
                    const verifiedViews = getCampaignVerifiedViews(campaign);
                    const viewsTarget = campaign.tiers?.views_target ?? 0;
                    const progressPct = viewsTarget > 0 ? Math.min(100, (verifiedViews / viewsTarget) * 100) : 0;
                    const pending = hasPendingProof(campaign);
                    return (
                      <tr key={campaign.id} className="hover:bg-[#F6F6F3] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link href="/marketer/campaigns" className="font-medium text-[#0B0B0C] hover:text-[#6E5BFF] transition-colors">
                              {campaign.title}
                            </Link>
                            {pending && <Badge variant="amber">Proof In Review</Badge>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {campaign.tiers ? (
                            <Badge variant={getTierBadgeVariant(campaign.tiers.name)}>{campaign.tiers.name}</Badge>
                          ) : <span className="text-[#8C8C88]">—</span>}
                        </td>
                        <td className="px-6 py-4">{statusBadge(campaign.status)}</td>
                        <td className="px-6 py-4 text-[#0B0B0C]">{campaign.applications.length}</td>
                        <td className="px-6 py-4 min-w-[160px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-[#8C8C88]">
                              <span className="font-mono">{formatNumber(verifiedViews)}</span>
                              <span className="font-mono">/ {formatNumber(viewsTarget)}</span>
                            </div>
                            <div className="w-full bg-[#ECECE8] rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full"
                                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #6E5BFF, #1FD3A3)' }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-[#0B0B0C]">
                          {campaign.tiers ? formatCurrency(campaign.tiers.total_charge) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
