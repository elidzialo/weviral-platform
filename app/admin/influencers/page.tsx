import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

interface InfluencerRow {
  id: string
  full_name: string
  email: string
  whatsapp_handle: string | null
  country: string
  stripe_onboarded: boolean
  created_at: string
  campaign_count: number
  total_earned: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(amount)
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

export default async function AdminInfluencersPage() {
  const adminClient = createAdminClient()

  const { data: profilesRaw, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, full_name, email, whatsapp_handle, country, stripe_onboarded, created_at')
    .eq('role', 'influencer')
    .order('created_at', { ascending: false })

  if (profilesError) {
    return (
      <div className="p-8">
        <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-700">
          Failed to load influencers: {profilesError.message}
        </div>
      </div>
    )
  }

  const profiles = profilesRaw ?? []
  const influencerIds = profiles.map((p) => p.id)

  const [applicationsResult, payoutsResult] = await Promise.all([
    influencerIds.length > 0
      ? adminClient.from('applications').select('influencer_id, status').in('influencer_id', influencerIds)
      : Promise.resolve({ data: [], error: null }),
    influencerIds.length > 0
      ? adminClient.from('payouts').select('influencer_id, amount').in('influencer_id', influencerIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const campaignCountMap = new Map<string, number>()
  for (const app of applicationsResult.data ?? []) {
    campaignCountMap.set(app.influencer_id, (campaignCountMap.get(app.influencer_id) ?? 0) + 1)
  }

  const earningsMap = new Map<string, number>()
  for (const payout of payoutsResult.data ?? []) {
    earningsMap.set(payout.influencer_id, (earningsMap.get(payout.influencer_id) ?? 0) + Number(payout.amount))
  }

  const influencers: InfluencerRow[] = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name || p.email,
    email: p.email,
    whatsapp_handle: p.whatsapp_handle,
    country: p.country || '—',
    stripe_onboarded: p.stripe_onboarded ?? false,
    created_at: p.created_at,
    campaign_count: campaignCountMap.get(p.id) ?? 0,
    total_earned: earningsMap.get(p.id) ?? 0,
  }))

  const totalEarnings = influencers.reduce((sum, i) => sum + i.total_earned, 0)
  const onboardedCount = influencers.filter((i) => i.stripe_onboarded).length
  const activeCount = influencers.filter((i) => i.campaign_count > 0).length

  return (
    <div className="min-h-screen">
      {/* Sticky topbar */}
      <div
        className="sticky top-0 z-10 px-8 py-4 border-b border-[#ECECE8]"
        style={{ background: 'rgba(246,246,243,.85)', backdropFilter: 'blur(14px)' }}
      >
        <h1 className="text-lg font-bold text-[#0B0B0C] leading-tight">Influencers</h1>
        <p className="text-[13px] text-[#8C8C88]">
          {influencers.length} registered · {onboardedCount} Stripe-onboarded · {formatCurrency(totalEarnings)} disbursed
        </p>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Influencers"
            value={influencers.length}
            sub={`${onboardedCount} with Stripe connected`}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          />
          <StatCard
            label="Active Posters"
            value={activeCount}
            sub="Have applied to campaigns"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
          />
          <StatCard
            label="Total Disbursed"
            value={formatCurrency(totalEarnings)}
            sub="All-time influencer payouts"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M9 9.5h4.5a1.6 1.6 0 010 3.2H9m0-3.2v6.5m0-6.5V8" /></svg>}
          />
        </div>

        {/* Table */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECECE8]">
            <h3 className="text-[15px] font-semibold text-[#0B0B0C]">All Influencers</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F6F6F3] text-[#8C8C88]">
              {influencers.length} total
            </span>
          </div>
          <CardBody className="p-0">
            {influencers.length === 0 ? (
              <EmptyState icon="📱" title="No influencers yet" description="Registered influencers will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-[#ECECE8]">
                      {['Influencer', 'WhatsApp', 'Country', 'Campaigns', 'Earned', 'Stripe', 'Joined'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECECE8]">
                    {influencers.map((influencer) => (
                      <tr key={influencer.id} className="hover:bg-[#F6F6F3] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold select-none"
                              style={{ background: 'linear-gradient(135deg,#6E5BFF,#4D7CFF)' }}
                            >
                              {getInitials(influencer.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0B0B0C] truncate">{influencer.full_name}</p>
                              <p className="text-xs text-[#8C8C88] truncate">{influencer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {influencer.whatsapp_handle
                            ? <span className="text-sm text-[#0B0B0C] font-mono">@{influencer.whatsapp_handle}</span>
                            : <span className="text-[#C4C4C0] text-sm">—</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#8C8C88]">{influencer.country}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-[#0B0B0C]">{influencer.campaign_count}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={['text-sm font-semibold', influencer.total_earned > 0 ? '' : 'text-[#C4C4C0]'].join(' ')} style={influencer.total_earned > 0 ? { color: '#1FD3A3' } : {}}>
                            {formatCurrency(influencer.total_earned)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {influencer.stripe_onboarded ? <Badge variant="green">Connected</Badge> : <Badge variant="amber">Pending</Badge>}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#8C8C88]">{formatDate(influencer.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
