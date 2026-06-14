import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function applicationStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="green">Active</Badge>;
    case 'proof_submitted':
      return <Badge variant="amber">Proof Submitted</Badge>;
    case 'paid':
      return <Badge variant="green">Paid</Badge>;
    case 'applied':
      return <Badge variant="purple">Applied</Badge>;
    case 'rejected':
      return <Badge variant="red">Rejected</Badge>;
    default:
      return <Badge variant="gray">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InfluencerDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch influencer's applications with campaign + tier data
  const { data: applications, error: appsError } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      applied_at,
      campaign_id,
      campaigns (
        id,
        title,
        description,
        status,
        deadline,
        tiers (
          id,
          name,
          views_target,
          influencer_payout,
          platform_fee,
          total_charge
        ),
        profiles!campaigns_marketer_id_fkey (
          id,
          full_name
        )
      )
    `)
    .eq('influencer_id', user.id)
    .order('applied_at', { ascending: false });

  if (appsError) {
    console.error('Dashboard applications fetch error:', appsError);
  }

  const apps: Application[] = (applications as Application[]) ?? [];

  // Calculate earnings metrics
  const paidApps = apps.filter((a) => a.status === 'paid');
  const pendingApps = apps.filter((a) => a.status === 'proof_submitted');
  const activeApps = apps.filter((a) => a.status === 'active');

  const totalEarned = paidApps.reduce((sum, a) => {
    const payout = a.campaigns?.tiers?.influencer_payout ?? 0;
    return sum + payout;
  }, 0);

  const pendingPayout = pendingApps.reduce((sum, a) => {
    const payout = a.campaigns?.tiers?.influencer_payout ?? 0;
    return sum + payout;
  }, 0);

  // Fetch top available campaigns (not yet applied to)
  const appliedCampaignIds = new Set(apps.map((a) => a.campaign_id));

  const { data: allCampaigns } = await supabase
    .from('campaigns')
    .select(`
      id,
      title,
      description,
      status,
      deadline,
      tiers (
        id,
        name,
        influencer_payout
      ),
      profiles!campaigns_marketer_id_fkey (
        id,
        full_name
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  const availableCampaigns = ((allCampaigns as Campaign[]) ?? [])
    .filter((c) => !appliedCampaignIds.has(c.id))
    .slice(0, 3);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back — here is your activity overview.</p>
      </div>

      {/* Earnings Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-violet-600 to-purple-700 text-white px-8 py-8 shadow-lg">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-purple-400/20 rounded-full blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-violet-200 text-sm font-medium uppercase tracking-wider mb-2">
              Total Earned
            </p>
            <p className="text-5xl font-extrabold leading-none">
              {formatCurrency(totalEarned)}
            </p>
            <p className="mt-1 text-violet-200 text-sm">
              Across {paidApps.length} completed {paidApps.length === 1 ? 'campaign' : 'campaigns'}
            </p>
          </div>

          {pendingPayout > 0 && (
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/20">
              <p className="text-violet-200 text-xs font-medium uppercase tracking-wider mb-1">
                Pending Payout
              </p>
              <p className="text-2xl font-bold">{formatCurrency(pendingPayout)}</p>
              <p className="text-violet-200 text-xs mt-1">
                {pendingApps.length} {pendingApps.length === 1 ? 'submission' : 'submissions'} under review
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5">
          <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{activeApps.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5">
          <p className="text-sm font-medium text-gray-500">Awaiting Review</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">{pendingApps.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5">
          <p className="text-sm font-medium text-gray-500">Total Applications</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{apps.length}</p>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Campaigns Card */}
        <Card>
          <CardHeader>
            <CardTitle>Active Campaigns</CardTitle>
            <Link
              href="/influencer/campaigns"
              className="text-sm text-violet-700 hover:text-violet-900 font-medium"
            >
              View all
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {activeApps.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500 text-sm">No active campaigns yet.</p>
                <p className="text-gray-400 text-xs mt-1">Browse campaigns and apply to get started.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activeApps.slice(0, 5).map((app) => {
                  const campaign = app.campaigns;
                  const payout = campaign?.tiers?.influencer_payout ?? 0;
                  return (
                    <li key={app.id} className="px-6 py-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {campaign?.title ?? 'Untitled Campaign'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {campaign?.tiers?.name ?? 'Standard'} tier &bull;{' '}
                          <span className="text-emerald-600 font-medium">{formatCurrency(payout)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {applicationStatusBadge(app.status)}
                        <Link
                          href="/influencer/campaigns"
                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-violet-700 text-white text-xs font-medium hover:bg-violet-800 transition-colors"
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

        {/* Available Campaigns Card */}
        <Card>
          <CardHeader>
            <CardTitle>Available Campaigns</CardTitle>
            <Link
              href="/influencer/browse"
              className="text-sm text-violet-700 hover:text-violet-900 font-medium"
            >
              Browse all
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {availableCampaigns.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500 text-sm">No new campaigns available right now.</p>
                <p className="text-gray-400 text-xs mt-1">Check back soon for new opportunities.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {availableCampaigns.map((campaign) => {
                  const payout = campaign.tiers?.influencer_payout ?? 0;
                  const marketer = (campaign.profiles as { full_name: string | null } | null)?.full_name;
                  return (
                    <li key={campaign.id} className="px-6 py-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{campaign.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {marketer ? `by ${marketer}` : 'WeViral Campaign'}
                          {campaign.tiers?.name && (
                            <> &bull; <span className="text-violet-700">{campaign.tiers.name}</span></>
                          )}
                        </p>
                        {payout > 0 && (
                          <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                            Earn {formatCurrency(payout)}
                          </p>
                        )}
                      </div>
                      <Link
                        href="/influencer/browse"
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors flex-shrink-0"
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

      {/* Recent paid campaigns */}
      {paidApps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Earnings</CardTitle>
            <Link
              href="/influencer/earnings"
              className="text-sm text-violet-700 hover:text-violet-900 font-medium"
            >
              View earnings
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paidApps.slice(0, 5).map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{app.campaigns?.title ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{app.campaigns?.tiers?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-500">
                        {format(new Date(app.applied_at), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-emerald-700">
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
  );
}
