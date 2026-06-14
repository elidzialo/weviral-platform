import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
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

interface Payout {
  id: string;
  amount: number;
  created_at: string;
  stripe_transfer_id: string | null;
}

interface Application {
  id: string;
  status: string;
  payouts: Payout[];
}

interface Campaign {
  id: string;
  title: string;
  status: string;
  created_at: string;
  stripe_checkout_session_id: string | null;
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type TxStatus = 'In Escrow' | 'Released' | 'Refunded' | 'Pending Payment';

function getCampaignTxStatus(campaign: Campaign): TxStatus {
  if (campaign.status === 'draft') return 'Pending Payment';
  if (campaign.status === 'cancelled') return 'Refunded';
  if (campaign.status === 'completed') return 'Released';
  return 'In Escrow';
}

function getTxStatusVariant(
  status: TxStatus
): 'green' | 'amber' | 'red' | 'gray' {
  const map: Record<TxStatus, 'green' | 'amber' | 'red' | 'gray'> = {
    'In Escrow': 'amber',
    Released: 'green',
    Refunded: 'red',
    'Pending Payment': 'gray',
  };
  return map[status];
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

function getTotalReleasedForCampaign(campaign: Campaign): number {
  let total = 0;
  for (const app of campaign.applications) {
    for (const payout of app.payouts) {
      total += payout.amount;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const Icons = {
  deposited: (
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
  released: (
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
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  escrow: (
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
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MarketerBillingPage() {
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
      status,
      created_at,
      stripe_checkout_session_id,
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
        payouts (
          id,
          amount,
          created_at,
          stripe_transfer_id
        )
      )
    `
    )
    .eq('marketer_id', user.id)
    .neq('status', 'draft')
    .order('created_at', { ascending: false });

  if (campaignsError) {
    console.error('MarketerBilling campaigns error:', campaignsError);
  }

  const allCampaigns: Campaign[] = (campaigns as Campaign[]) ?? [];

  // -------------------------------------------------------------------------
  // Compute summary figures
  // -------------------------------------------------------------------------

  let totalDeposited = 0;
  let totalReleased = 0;

  for (const campaign of allCampaigns) {
    if (campaign.status !== 'cancelled') {
      totalDeposited += campaign.tiers?.total_charge ?? 0;
    }
    totalReleased += getTotalReleasedForCampaign(campaign);
  }

  const remainingInEscrow = Math.max(0, totalDeposited - totalReleased);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your payment history and escrow status
        </p>
      </div>

      {/* Payment method note */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <svg
          className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
        <div>
          <p className="font-semibold text-blue-800">Payments via Stripe</p>
          <p className="mt-0.5 text-blue-600">
            All payments are processed securely by Stripe. Your card details
            are never stored on our servers. Funds are held in escrow until
            influencer proof is verified and approved.
          </p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Deposited"
          value={formatCurrency(totalDeposited)}
          sub="All paid campaigns"
          icon={Icons.deposited}
        />
        <StatCard
          label="Released to Influencers"
          value={formatCurrency(totalReleased)}
          sub="Approved & paid out"
          icon={Icons.released}
        />
        <StatCard
          label="Remaining in Escrow"
          value={formatCurrency(remainingInEscrow)}
          sub="Awaiting verification"
          icon={Icons.escrow}
        />
      </div>

      {/* Transaction table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <span className="text-sm text-gray-500">
            {allCampaigns.length} transaction
            {allCampaigns.length !== 1 ? 's' : ''}
          </span>
        </CardHeader>

        {allCampaigns.length === 0 ? (
          <CardBody>
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">
                No transactions yet
              </p>
              <p className="text-sm text-gray-400">
                Your payment history will appear here after your first
                campaign payment.
              </p>
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
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Released
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allCampaigns.map((campaign) => {
                  const txStatus = getCampaignTxStatus(campaign);
                  const statusVariant = getTxStatusVariant(txStatus);
                  const released = getTotalReleasedForCampaign(campaign);
                  const amountPaid =
                    campaign.status !== 'cancelled'
                      ? (campaign.tiers?.total_charge ?? 0)
                      : 0;

                  return (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {campaign.title}
                        </p>
                        {campaign.stripe_checkout_session_id && (
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            {campaign.stripe_checkout_session_id.slice(0, 28)}
                            …
                          </p>
                        )}
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
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(campaign.created_at)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {amountPaid > 0 ? formatCurrency(amountPaid) : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {released > 0 ? formatCurrency(released) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant}>{txStatus}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals footer */}
              {allCampaigns.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td
                      colSpan={3}
                      className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      Totals
                    </td>
                    <td className="px-6 py-3 font-bold text-gray-900">
                      {formatCurrency(totalDeposited)}
                    </td>
                    <td className="px-6 py-3 font-bold text-emerald-700">
                      {formatCurrency(totalReleased)}
                    </td>
                    <td className="px-6 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>

      {/* Escrow explanation */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">
          How Escrow Works
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: 'You pay to escrow',
              description:
                'When you launch a campaign, the full amount is held securely in escrow via Stripe.',
            },
            {
              step: '2',
              title: 'Influencers deliver',
              description:
                'Influencers share your content and submit screenshot proof. Our AI verifies the view count.',
            },
            {
              step: '3',
              title: 'Funds are released',
              description:
                'After admin approval, the influencer payout is transferred instantly. Platform fee is retained.',
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
