import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-GB').format(n);
}

function getTierBadgeVariant(
  name: string
): 'green' | 'purple' | 'amber' | 'gray' {
  const map: Record<string, 'green' | 'purple' | 'amber' | 'gray'> = {
    Starter: 'gray',
    Growth: 'amber',
    Viral: 'purple',
    Elite: 'green',
  };
  return map[name] ?? 'gray';
}

function getCampaignVerifiedViews(campaign: Campaign): number {
  let total = 0;
  for (const app of campaign.applications) {
    for (const proof of app.proof_submissions) {
      if (proof.status === 'approved') {
        total += proof.ai_view_count;
      }
    }
  }
  return total;
}

function hasPendingProof(campaign: Campaign): boolean {
  return campaign.applications.some((app) =>
    app.proof_submissions.some((p) => p.status === 'pending')
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const Icons = {
  campaigns: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    </svg>
  ),
  eye: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  cash: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  chart: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MarketerDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select(
      `
      id,
      title,
      description,
      status,
      created_at,
      tiers (
        id,
        name,
        views_target,
        influencer_payout,
        platform_fee,
        total_charge
      ),
      applications (
        id,
        status,
        proof_submissions (
          ai_view_count,
          status
        )
      )
    `
    )
    .eq('marketer_id', user.id)
    .order('created_at', { ascending: false });

  if (campaignsError) {
    console.error('MarketerDashboard campaigns error:', campaignsError);
  }

  const allCampaigns: Campaign[] = (campaigns as Campaign[]) ?? [];

  // Compute stats
  const totalCampaigns = allCampaigns.length;

  let totalVerifiedViews = 0;
  let totalSpent = 0;

  for (const campaign of allCampaigns) {
    totalVerifiedViews += getCampaignVerifiedViews(campaign);
    if (
      campaign.status === 'active' ||
      campaign.status === 'completed'
    ) {
      totalSpent += campaign.tiers?.total_charge ?? 0;
    }
  }

  const avgCostPerView =
    totalVerifiedViews > 0 ? totalSpent / totalVerifiedViews : 0;

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your campaigns and performance
          </p>
        </div>
        <Link
          href="/marketer/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-700 text-white text-sm font-medium rounded-lg hover:bg-violet-800 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Campaign
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Campaigns"
          value={totalCampaigns}
          sub="All time"
          icon={Icons.campaigns}
        />
        <StatCard
          label="Verified Views"
          value={formatNumber(totalVerifiedViews)}
          sub="From approved proofs"
          icon={Icons.eye}
        />
        <StatCard
          label="Total Spent"
          value={formatCurrency(totalSpent)}
          sub="Escrow deposits"
          icon={Icons.cash}
        />
        <StatCard
          label="Avg Cost / View"
          value={totalVerifiedViews > 0 ? formatCurrency(avgCostPerView) : '—'}
          sub="Based on verified views"
          icon={Icons.chart}
        />
      </div>

      {/* Campaigns table */}
      <Card>
        <CardHeader>
          <CardTitle>My Campaigns</CardTitle>
          <span className="text-sm text-gray-500">
            {totalCampaigns} campaign{totalCampaigns !== 1 ? 's' : ''}
          </span>
        </CardHeader>

        {allCampaigns.length === 0 ? (
          <CardBody>
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-violet-400">
                {Icons.campaigns}
              </div>
              <p className="text-sm font-medium text-gray-700">
                No campaigns yet
              </p>
              <p className="text-sm text-gray-400">
                Launch your first campaign to start getting verified views.
              </p>
              <Link
                href="/marketer/create"
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-700 text-white text-sm font-medium rounded-lg hover:bg-violet-800 transition-colors"
              >
                Create Campaign
              </Link>
            </div>
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Influencers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Verified Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allCampaigns.map((campaign) => {
                  const verifiedViews = getCampaignVerifiedViews(campaign);
                  const viewsTarget = campaign.tiers?.views_target ?? 0;
                  const progressPct =
                    viewsTarget > 0
                      ? Math.min(100, (verifiedViews / viewsTarget) * 100)
                      : 0;
                  const pending = hasPendingProof(campaign);

                  return (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/marketer/campaigns`}
                            className="font-medium text-gray-900 hover:text-violet-700 transition-colors"
                          >
                            {campaign.title}
                          </Link>
                          {pending && (
                            <Badge variant="amber">Proof In Review</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {campaign.tiers ? (
                          <Badge
                            variant={getTierBadgeVariant(campaign.tiers.name)}
                          >
                            {campaign.tiers.name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge(campaign.status)}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {campaign.applications.length}
                      </td>
                      <td className="px-6 py-4 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>{formatNumber(verifiedViews)}</span>
                            <span className="text-gray-400">
                              / {formatNumber(viewsTarget)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-violet-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        {campaign.tiers
                          ? formatCurrency(campaign.tiers.total_charge)
                          : '—'}
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
  );
}
