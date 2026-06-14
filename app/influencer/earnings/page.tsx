import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import StripeConnectButton from './StripeConnectButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Payout {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  stripe_transfer_id: string | null;
  applications: {
    id: string;
    campaigns: {
      id: string;
      title: string;
      tiers: {
        name: string;
      } | null;
    } | null;
  } | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
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

// ---------------------------------------------------------------------------
// Page (server component)
// ---------------------------------------------------------------------------

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: { stripe?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch influencer profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, stripe_account_id, stripe_onboarded')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  const typedProfile = profile as Profile;

  // Fetch payout history joined with campaign + tier names
  const { data: payouts, error: payoutsError } = await supabase
    .from('payouts')
    .select(`
      id,
      created_at,
      amount,
      status,
      stripe_transfer_id,
      applications (
        id,
        campaigns (
          id,
          title,
          tiers (
            name
          )
        )
      )
    `)
    .eq('influencer_id', user.id)
    .order('created_at', { ascending: false });

  if (payoutsError) {
    console.error('Earnings payouts fetch error:', payoutsError);
  }

  const typedPayouts: Payout[] = (payouts as Payout[]) ?? [];

  // Fetch paid applications for total earned calculation
  const { data: paidApps } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      campaigns (
        tiers (
          influencer_payout
        )
      )
    `)
    .eq('influencer_id', user.id)
    .eq('status', 'paid');

  const { data: pendingApps } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      campaigns (
        tiers (
          influencer_payout
        )
      )
    `)
    .eq('influencer_id', user.id)
    .eq('status', 'proof_submitted');

  type AppWithPayout = {
    id: string;
    status: string;
    campaigns: { tiers: { influencer_payout: number } | null } | null;
  };

  const totalPaidOut = ((paidApps as AppWithPayout[]) ?? []).reduce((sum, a) => {
    return sum + (a.campaigns?.tiers?.influencer_payout ?? 0);
  }, 0);

  const totalPending = ((pendingApps as AppWithPayout[]) ?? []).reduce((sum, a) => {
    return sum + (a.campaigns?.tiers?.influencer_payout ?? 0);
  }, 0);

  const stripeSuccess = searchParams.stripe === 'success';

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="text-sm text-gray-500 mt-1">Track your payouts and manage your bank connection.</p>
      </div>

      {/* Stripe success notification */}
      {stripeSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Bank account connected!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Your Stripe account is set up. You will receive payouts automatically once campaigns are approved.
            </p>
          </div>
        </div>
      )}

      {/* Stripe Connect Banner / Status */}
      {!typedProfile.stripe_onboarded ? (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-base font-bold text-amber-900">Connect your bank to receive payments</h2>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">
                You need to connect a bank account via Stripe before you can receive campaign payouts.
                This is a one-time setup that takes about 2 minutes.
              </p>
            </div>
            <div className="flex-shrink-0">
              <StripeConnectButton />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Stripe connected</p>
            <p className="text-xs text-emerald-600 mt-0.5">Your bank account is set up. Payouts will be sent automatically.</p>
          </div>
          <div className="ml-auto">
            <Badge variant="green">Active</Badge>
          </div>
        </div>
      )}

      {/* Earnings summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5">
          <p className="text-sm font-medium text-gray-500">Total Paid Out</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{formatCurrency(totalPaidOut)}</p>
          <p className="mt-1 text-xs text-gray-400">{(paidApps ?? []).length} completed campaigns</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-5">
          <p className="text-sm font-medium text-gray-500">Pending Payout</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{formatCurrency(totalPending)}</p>
          <p className="mt-1 text-xs text-gray-400">{(pendingApps ?? []).length} awaiting review</p>
        </div>
      </div>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {typedPayouts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 text-sm font-medium">No payouts yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Complete campaigns and get your proof approved to start earning.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {typedPayouts.map((payout) => {
                    const campaign = payout.applications?.campaigns;
                    const tierName = campaign?.tiers?.name;
                    return (
                      <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                          {format(new Date(payout.created_at), 'dd MMM yyyy')}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 max-w-[200px]">
                          <span className="truncate block">{campaign?.title ?? '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {tierName ? (
                            <Badge variant="purple">{tierName}</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                          {formatCurrency(payout.amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Paid
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Summary footer */}
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-sm font-semibold text-gray-700">Total</td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(
                        typedPayouts.reduce((sum, p) => sum + p.amount, 0)
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
