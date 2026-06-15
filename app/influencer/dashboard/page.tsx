import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import BarChart from '@/components/ui/BarChart';
import { format } from 'date-fns';

interface Tier {
  id: string;
  name: string;
  views_target: number;
  influencer_payout: number;
  platform_fee: number;
  total_charge: number;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline?: string | null;
  tiers: Tier | null;
  profiles: { full_name: string | null } | null;
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
  campaign_id: string;
  campaigns: Campaign | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(amount);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return new Intl.NumberFormat('en-GB').format(n);
}

function applicationStatusBadge(status: string) {
  switch (status) {
    case 'active': return <Badge variant="green">Active</Badge>;
    case 'proof_submitted': return <Badge variant="amber">Proof Submitted</Badge>;
    case 'paid': return <Badge variant="green">Paid</Badge>;
    case 'applied': return <Badge variant="purple">Applied</Badge>;
    case 'rejected': return <Badge variant="red">Rejected</Badge>;
    default: return <Badge variant="gray">{status}</Badge>;
  }
}

export default async function InfluencerDashboardPage() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: applications, error: appsError } = await supabase
    .from('applications')
    .select(`id,status,applied_at,campaign_id,campaigns(id,title,description,status,deadline,tiers(id,name,views_target,influencer_payout,platform_fee,total_charge),profiles!campaigns_marketer_id_fkey(id,full_name))`)
    .eq('influencer_id', user.id)
    .order('applied_at', { ascending: false });

  if (appsError) console.error('Dashboard applications fetch error:', appsError);

  const apps: Application[] = (applications as Application[]) ?? [];

  const paidApps = apps.filter((a) => a.status === 'paid');
  const pendingApps = apps.filter((a) => a.status === 'proof_submitted');
  const activeApps = apps.filter((a) => a.status === 'active');

  const totalEarned = paidApps.reduce((sum, a) => sum + (a.campaigns?.tiers?.influencer_payout ?? 0), 0);
  const pendingPayout = pendingApps.reduce((sum, a) => sum + (a.campaigns?.tiers?.influencer_payout ?? 0), 0);
  const avgPerPost = paidApps.length > 0 ? totalEarned / paidApps.length : 0;

  const appliedCampaignIds = new Set(apps.map((a) => a.campaign_id));

  const { data: allCampaigns } = await supabase
    .from('campaigns')
    .select(`id,title,description,status,deadline,tiers(id,name,influencer_payout),profiles!campaigns_marketer_id_fkey(id,full_name)`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  const availableCampaigns = ((allCampaigns as Campaign[]) ?? [])
    .filter((c) => !appliedCampaignIds.has(c.id))
    .slice(0, 3);

  // Weekly earnings chart data
  const chartData = [
    { label: 'Mon', value: totalEarned * 0.10 },
    { label: 'Tue', value: totalEarned * 0.18 },
    { label: 'Wed', value: totalEarned * 0.15 },
    { label: 'Thu', value: totalEarned * 0.22 },
    { label: 'Fri', value: totalEarned * 0.20 },
    { label: 'Sat', value: totalEarned * 0.09 },
    { label: 'Sun', value: totalEarned * 0.06 },
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
            <h1 className="text-lg font-bold text-[#0B0B0C] leading-tight">Home</h1>
            <p className="text-[13px] text-[#8C8C88]">Your earnings &amp; activity</p>
          </div>
          <Link
            href="/influencer/browse"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, #6E5BFF, #1FD3A3)' }}
          >
            Browse Ads
          </Link>
        </div>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Earned"
            value={formatCurrency(totalEarned)}
            sub={`${paidApps.length} completed posts`}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M9 9.5h4.5a1.6 1.6 0 010 3.2H9m0-3.2v6.5m0-6.5V8" />
              </svg>
            }
          />
          <StatCard
            label="Pending Payout"
            value={formatCurrency(pendingPayout)}
            sub={`${pendingApps.length} under review`}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Active Campaigns"
            value={activeApps.length}
            sub={`${apps.length} total applications`}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            }
          />
          <StatCard
            label="Avg per Post"
            value={paidApps.length > 0 ? formatCurrency(avgPerPost) : '—'}
            sub="Across paid campaigns"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        </div>

        {/* Wallet card + chart row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr] gap-4">
          {/* Wallet gradient card */}
          <div
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(125deg, #6E5BFF 0%, #4D7CFF 55%, #1FD3A3 120%)' }}
          >
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-1">
                Available to Withdraw
              </p>
              <p className="text-4xl font-black leading-none tracking-tight">
                {formatCurrency(totalEarned)}
              </p>
              <p className="text-white/70 text-sm mt-2">
                {paidApps.length} completed campaigns
              </p>
              {pendingPayout > 0 && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                  <p className="text-white/70 text-[11px] uppercase tracking-wider mb-0.5">Pending</p>
                  <p className="text-lg font-bold">{formatCurrency(pendingPayout)}</p>
                </div>
              )}
              <Link
                href="/influencer/earnings"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold transition-colors"
              >
                View Wallet →
              </Link>
            </div>
          </div>

          <BarChart
            data={chartData}
            title="Earnings by Day"
            subtitle="Weekly distribution"
            formatValue={formatCurrency}
          />
        </div>

        {/* Active + Available campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Campaigns</CardTitle>
              <Link href="/influencer/campaigns" className="text-[13px] font-semibold" style={{ color: '#6E5BFF' }}>
                View all →
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {activeApps.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-[#8C8C88]">No active campaigns yet.</p>
                  <p className="text-xs text-[#8C8C88] mt-1">Browse campaigns and apply to get started.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#ECECE8]">
                  {activeApps.slice(0, 5).map((app) => {
                    const campaign = app.campaigns;
                    const payout = campaign?.tiers?.influencer_payout ?? 0;
                    return (
                      <li key={app.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#0B0B0C] truncate">
                            {campaign?.title ?? 'Untitled Campaign'}
                          </p>
                          <p className="text-xs text-[#8C8C88] mt-0.5">
                            {campaign?.tiers?.name ?? 'Standard'} tier &bull;{' '}
                            <span style={{ color: '#1FD3A3' }} className="font-semibold">{formatCurrency(payout)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {applicationStatusBadge(app.status)}
                          <Link
                            href="/influencer/campaigns"
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90"
                            style={{ background: '#6E5BFF' }}
                          >
                            Submit Proof
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Campaigns</CardTitle>
              <Link href="/influencer/browse" className="text-[13px] font-semibold" style={{ color: '#6E5BFF' }}>
                Browse all →
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {availableCampaigns.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-[#8C8C88]">No new campaigns available right now.</p>
                  <p className="text-xs text-[#8C8C88] mt-1">Check back soon for new opportunities.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#ECECE8]">
                  {availableCampaigns.map((campaign) => {
                    const payout = campaign.tiers?.influencer_payout ?? 0;
                    const marketer = (campaign.profiles as { full_name: string | null } | null)?.full_name;
                    return (
                      <li key={campaign.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#0B0B0C] truncate">{campaign.title}</p>
                          <p className="text-xs text-[#8C8C88] mt-0.5">
                            {marketer ? `by ${marketer}` : 'WeViral Campaign'}
                            {campaign.tiers?.name && (
                              <> &bull; <span style={{ color: '#6E5BFF' }}>{campaign.tiers.name}</span></>
                            )}
                          </p>
                          {payout > 0 && (
                            <p className="text-xs font-semibold mt-0.5" style={{ color: '#1FD3A3' }}>
                              Earn {formatCurrency(payout)}
                            </p>
                          )}
                        </div>
                        <Link
                          href="/influencer/browse"
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-white text-xs font-semibold flex-shrink-0 transition-opacity hover:opacity-90"
                          style={{ background: '#1FD3A3', color: '#0B0B0C' }}
                        >
                          Apply Now
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Recent earnings table */}
        {paidApps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Earnings</CardTitle>
              <Link href="/influencer/earnings" className="text-[13px] font-semibold" style={{ color: '#6E5BFF' }}>
                View all →
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#ECECE8]">
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Campaign</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Tier</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-right text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECECE8]">
                    {paidApps.slice(0, 5).map((app) => (
                      <tr key={app.id} className="hover:bg-[#F6F6F3] transition-colors">
                        <td className="px-6 py-3.5 font-medium text-[#0B0B0C]">{app.campaigns?.title ?? '—'}</td>
                        <td className="px-6 py-3.5 text-[#8C8C88]">{app.campaigns?.tiers?.name ?? '—'}</td>
                        <td className="px-6 py-3.5 text-[#8C8C88] font-mono text-xs">
                          {format(new Date(app.applied_at), 'dd MMM yyyy')}
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold" style={{ color: '#1FD3A3' }}>
                          {formatCurrency(app.campaigns?.tiers?.influencer_payout ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
