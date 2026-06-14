import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
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

interface ProofSubmission {
  id: string;
  ai_view_count: number;
  status: string;
  submitted_at: string;
}

interface Application {
  id: string;
  status: string;
  applied_at: string;
  proof_submissions: ProofSubmission[];
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  status: string;
  creative_url: string | null;
  created_at: string;
  updated_at: string;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

function getTierIcon(name: string): string {
  const map: Record<string, string> = {
    Starter: '🌱',
    Growth: '📈',
    Viral: '🚀',
    Elite: '👑',
  };
  return map[name] ?? '📦';
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

function getApplicantCounts(campaign: Campaign): {
  total: number;
  active: number;
  approved: number;
} {
  return {
    total: campaign.applications.length,
    active: campaign.applications.filter(
      (a) => a.status === 'active' || a.status === 'proof_submitted'
    ).length,
    approved: campaign.applications.filter(
      (a) => a.status === 'approved' || a.status === 'paid'
    ).length,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MarketerCampaignsPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
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
      creative_url,
      created_at,
      updated_at,
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
        applied_at,
        proof_submissions (
          id,
          ai_view_count,
          status,
          submitted_at
        )
      )
    `
    )
    .eq('marketer_id', user.id)
    .order('created_at', { ascending: false });

  if (campaignsError) {
    console.error('MarketerCampaigns error:', campaignsError);
  }

  const allCampaigns: Campaign[] = (campaigns as Campaign[]) ?? [];
  const showSuccess = searchParams.success === '1';

  // Group by status for summary
  const activeCampaigns = allCampaigns.filter((c) => c.status === 'active');
  const draftCampaigns = allCampaigns.filter((c) => c.status === 'draft');
  const completedCampaigns = allCampaigns.filter(
    (c) => c.status === 'completed'
  );

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">
      {/* Success banner */}
      {showSuccess && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-semibold">Payment successful!</p>
            <p className="text-emerald-700 mt-0.5">
              Your campaign payment has been received and held in escrow. Your
              campaign is now live and influencers can apply.
            </p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            {allCampaigns.length} campaign
            {allCampaigns.length !== 1 ? 's' : ''} total &middot;{' '}
            {activeCampaigns.length} active &middot; {draftCampaigns.length}{' '}
            draft &middot; {completedCampaigns.length} completed
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

      {/* Empty state */}
      {allCampaigns.length === 0 ? (
        <Card>
          <CardBody>
            <div className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-800">
                  No campaigns yet
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Create your first campaign to start getting verified WhatsApp
                  views.
                </p>
              </div>
              <Link
                href="/marketer/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-700 text-white text-sm font-medium rounded-lg hover:bg-violet-800 transition-colors"
              >
                Create Campaign
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {allCampaigns.map((campaign) => {
            const verifiedViews = getCampaignVerifiedViews(campaign);
            const viewsTarget = campaign.tiers?.views_target ?? 0;
            const progressPct =
              viewsTarget > 0
                ? Math.min(100, (verifiedViews / viewsTarget) * 100)
                : 0;
            const pending = hasPendingProof(campaign);
            const counts = getApplicantCounts(campaign);

            return (
              <div
                key={campaign.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Card header */}
                <div className="px-6 py-4 flex items-start justify-between gap-4 border-b border-gray-100">
                  <div className="flex items-start gap-3 min-w-0">
                    {campaign.tiers && (
                      <span className="text-xl flex-shrink-0 mt-0.5">
                        {getTierIcon(campaign.tiers.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {campaign.title}
                      </h3>
                      {campaign.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                          {campaign.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {pending && (
                      <Badge variant="amber">Proof Under Review</Badge>
                    )}
                    {statusBadge(campaign.status)}
                    {campaign.tiers && (
                      <Badge
                        variant={getTierBadgeVariant(campaign.tiers.name)}
                      >
                        {campaign.tiers.name}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Applicants */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">
                        Applicants
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {counts.total}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {counts.active} active &middot; {counts.approved}{' '}
                        approved
                      </p>
                    </div>

                    {/* Verified views */}
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">
                        Verified Views
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                            <span className="font-semibold">
                              {formatNumber(verifiedViews)}
                            </span>
                            <span className="text-gray-400">
                              / {formatNumber(viewsTarget)} target
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={[
                                'h-2 rounded-full transition-all',
                                progressPct >= 100
                                  ? 'bg-emerald-500'
                                  : progressPct >= 50
                                  ? 'bg-violet-500'
                                  : 'bg-violet-400',
                              ].join(' ')}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                          {progressPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Cost */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">
                        Total Cost
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {campaign.tiers
                          ? formatCurrency(campaign.tiers.total_charge)
                          : '—'}
                      </p>
                      {campaign.tiers && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Influencer gets{' '}
                          {formatCurrency(campaign.tiers.influencer_payout)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Created {formatDate(campaign.created_at)}
                  </p>
                  {campaign.status === 'draft' && (
                    <Link
                      href="/marketer/create"
                      className="text-xs font-medium text-violet-700 hover:text-violet-900 transition-colors"
                    >
                      Complete payment to launch &rarr;
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
