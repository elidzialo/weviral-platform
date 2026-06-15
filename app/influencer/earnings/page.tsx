import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { format } from 'date-fns';
import StripeConnectButton from './StripeConnectButton';

export const dynamic = 'force-dynamic'

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
      tiers: { name: string } | null;
    } | null;
  } | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(amount);
}

export default async function EarningsPage({ searchParams }: { searchParams: { stripe?: string } }) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, stripe_account_id, stripe_onboarded')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) redirect('/login');

  const typedProfile = profile as Profile;

  const [payoutsResult, paidAppsResult, pendingAppsResult] = await Promise.all([
    supabase
      .from('payouts')
      .select(`id,created_at,amount,status,stripe_transfer_id,applications(id,campaigns(id,title,tiers(name)))`)
      .eq('influencer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('applications')
      .select('id,status,campaigns(tiers(influencer_payout))')
      .eq('influencer_id', user.id)
      .eq('status', 'paid'),
    supabase
      .from('applications')
      .select('id,status,campaigns(tiers(influencer_payout))')
      .eq('influencer_id', user.id)
      .eq('status', 'proof_submitted'),
  ]);

  type AppWithPayout = { id: string; status: string; campaigns: { tiers: { influencer_payout: number } | null } | null };
  const typedPayouts: Payout[] = (payoutsResult.data as Payout[]) ?? [];
  const totalPaidOut = ((paidAppsResult.data as AppWithPayout[]) ?? []).reduce((sum, a) => sum + (a.campaigns?.tiers?.influencer_payout ?? 0), 0);
  const totalPending = ((pendingAppsResult.data as AppWithPayout[]) ?? []).reduce((sum, a) => sum + (a.campaigns?.tiers?.influencer_payout ?? 0), 0);
  const paidCount = paidAppsResult.data?.length ?? 0;
  const pendingCount = pendingAppsResult.data?.length ?? 0;
  const stripeSuccess = searchParams.stripe === 'success';

  return (
    <div className="min-h-screen" style={{ background: '#F6F6F3' }}>
      {/* Sticky topbar */}
      <div
        className="sticky top-0 z-10 px-8 py-4 border-b border-[#ECECE8]"
        style={{ background: 'rgba(246,246,243,.85)', backdropFilter: 'blur(14px)' }}
      >
        <h1 className="text-lg font-bold text-[#0B0B0C] leading-tight">Wallet & Earnings</h1>
        <p className="text-[13px] text-[#8C8C88]">Your payouts and bank connection</p>
      </div>

      <div className="px-8 py-7 max-w-5xl space-y-6">
        {/* Stripe success */}
        {stripeSuccess && (
          <div className="flex items-start gap-3 p-4 rounded-xl text-sm border" style={{ background: 'rgba(31,211,163,.08)', borderColor: 'rgba(31,211,163,.3)', color: '#0F7A5A' }}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <p className="font-semibold">Bank account connected!</p>
              <p className="mt-0.5 opacity-80">You will receive payouts automatically once campaigns are approved.</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(125deg, #6E5BFF 0%, #4D7CFF 55%, #1FD3A3 120%)' }}
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-1">Total Earned</p>
              <p className="text-3xl font-black leading-none tracking-tight">{formatCurrency(totalPaidOut)}</p>
              <p className="text-white/70 text-xs mt-2">{paidCount} completed campaign{paidCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <StatCard
            label="Pending Payout"
            value={formatCurrency(totalPending)}
            sub={`${pendingCount} under review`}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Avg per Campaign"
            value={paidCount > 0 ? formatCurrency(totalPaidOut / paidCount) : '—'}
            sub="Based on paid campaigns"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        </div>

        {/* Stripe Connect */}
        {!typedProfile.stripe_onboarded ? (
          <div
            className="rounded-2xl p-6 border"
            style={{ background: 'rgba(245,158,11,.06)', borderColor: 'rgba(245,158,11,.3)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,.12)' }}>
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-[15px] font-bold text-amber-900 mb-1">Connect your bank to receive payments</h2>
                <p className="text-sm text-amber-800 leading-relaxed">
                  One-time setup via Stripe — takes about 2 minutes. Required before any payout can be sent.
                </p>
              </div>
              <div className="flex-shrink-0">
                <StripeConnectButton />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl border" style={{ background: 'rgba(31,211,163,.06)', borderColor: 'rgba(31,211,163,.25)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(31,211,163,.15)' }}>
              <svg className="w-5 h-5" style={{ color: '#1FD3A3' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#0F7A5A' }}>Stripe connected</p>
              <p className="text-xs" style={{ color: '#1FD3A3' }}>Payouts are sent automatically after approval.</p>
            </div>
            <Badge variant="green">Active</Badge>
          </div>
        )}

        {/* Payout History */}
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            {typedPayouts.length > 0 && (
              <span className="text-[13px] font-semibold" style={{ color: '#1FD3A3' }}>
                {formatCurrency(typedPayouts.reduce((s, p) => s + p.amount, 0))} total
              </span>
            )}
          </CardHeader>
          <CardBody className="p-0">
            {typedPayouts.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[rgba(110,91,255,.08)] flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#6E5BFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-[#0B0B0C] font-semibold text-sm mb-1">No payouts yet</p>
                <p className="text-[#8C8C88] text-xs">Complete campaigns and get your proof approved to start earning.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#ECECE8]">
                      {['Date', 'Campaign', 'Tier', 'Amount', 'Status'].map((h, i) => (
                        <th key={h} className={['px-6 py-3 text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider', i === 3 ? 'text-right' : 'text-left', i === 4 ? 'text-center' : ''].join(' ')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECECE8]">
                    {typedPayouts.map((payout) => {
                      const campaign = payout.applications?.campaigns;
                      const tierName = campaign?.tiers?.name;
                      return (
                        <tr key={payout.id} className="hover:bg-[#F6F6F3] transition-colors">
                          <td className="px-6 py-4 text-[#8C8C88] whitespace-nowrap text-[13px]">{format(new Date(payout.created_at), 'dd MMM yyyy')}</td>
                          <td className="px-6 py-4 font-medium text-[#0B0B0C] max-w-[200px]"><span className="truncate block">{campaign?.title ?? '—'}</span></td>
                          <td className="px-6 py-4">{tierName ? <Badge variant="purple">{tierName}</Badge> : <span className="text-[#8C8C88]">—</span>}</td>
                          <td className="px-6 py-4 text-right font-bold whitespace-nowrap" style={{ color: '#1FD3A3' }}>{formatCurrency(payout.amount)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#1FD3A3' }}>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              Paid
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-[#ECECE8]" style={{ background: '#F6F6F3' }}>
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-sm font-semibold text-[#0B0B0C]">Total</td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-[#0B0B0C]">{formatCurrency(typedPayouts.reduce((s, p) => s + p.amount, 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
