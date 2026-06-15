import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardBody } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

interface MarketerRow {
  id: string
  full_name: string
  email: string
  country: string
  created_at: string
  campaign_count: number
  total_spent: number
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

export default async function AdminMarketersPage() {
  const adminClient = createAdminClient()

  const { data: profilesRaw, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, full_name, email, country, created_at')
    .eq('role', 'marketer')
    .order('created_at', { ascending: false })

  if (profilesError) {
    return (
      <div className="p-8">
        <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-700">
          Failed to load marketers: {profilesError.message}
        </div>
      </div>
    )
  }

  const profiles = profilesRaw ?? []
  const marketerIds = profiles.map((p) => p.id)

  const { data: campaignsRaw } = marketerIds.length > 0
    ? await adminClient
        .from('campaigns')
        .select('marketer_id,status,tiers(total_charge)')
        .in('marketer_id', marketerIds)
    : { data: [] }

  const campaignCountMap = new Map<string, number>()
  const totalSpentMap = new Map<string, number>()

  for (const campaign of campaignsRaw ?? []) {
    const mid = (campaign as any).marketer_id
    campaignCountMap.set(mid, (campaignCountMap.get(mid) ?? 0) + 1)
    if ((campaign as any).status !== 'draft') {
      const charge = Number((campaign as any).tiers?.total_charge ?? 0)
      totalSpentMap.set(mid, (totalSpentMap.get(mid) ?? 0) + charge)
    }
  }

  const marketers: MarketerRow[] = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name || p.email,
    email: p.email,
    country: p.country || '—',
    created_at: p.created_at,
    campaign_count: campaignCountMap.get(p.id) ?? 0,
    total_spent: totalSpentMap.get(p.id) ?? 0,
  }))

  const totalSpentAll = marketers.reduce((sum, m) => sum + m.total_spent, 0)
  const activeCount = marketers.filter((m) => m.campaign_count > 0).length

  return (
    <div className="min-h-screen">
      {/* Sticky topbar */}
      <div
        className="sticky top-0 z-10 px-8 py-4 border-b border-[#ECECE8]"
        style={{ background: 'rgba(246,246,243,.85)', backdropFilter: 'blur(14px)' }}
      >
        <h1 className="text-lg font-bold text-[#0B0B0C] leading-tight">Marketers</h1>
        <p className="text-[13px] text-[#8C8C88]">
          {marketers.length} registered · {formatCurrency(totalSpentAll)} total platform spend
        </p>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Marketers"
            value={marketers.length}
            sub={`${activeCount} with active campaigns`}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          />
          <StatCard
            label="Total Spend"
            value={formatCurrency(totalSpentAll)}
            sub="Non-draft campaigns"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M9 9.5h4.5a1.6 1.6 0 010 3.2H9m0-3.2v6.5m0-6.5V8" /></svg>}
          />
          <StatCard
            label="Active Advertisers"
            value={activeCount}
            sub="With at least 1 campaign"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
          />
        </div>

        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECECE8]">
            <h3 className="text-[15px] font-semibold text-[#0B0B0C]">All Marketers</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F6F6F3] text-[#8C8C88]">
              {marketers.length} total
            </span>
          </div>
          <CardBody className="p-0">
            {marketers.length === 0 ? (
              <EmptyState icon="💼" title="No marketers yet" description="Registered marketers will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-[#ECECE8]">
                      {['Marketer', 'Country', 'Campaigns', 'Total Spent', 'Joined'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECECE8]">
                    {marketers.map((marketer) => (
                      <tr key={marketer.id} className="hover:bg-[#F6F6F3] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold select-none"
                              style={{ background: 'linear-gradient(135deg,#1FD3A3,#4D7CFF)' }}
                            >
                              {getInitials(marketer.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#0B0B0C] truncate">{marketer.full_name}</p>
                              <p className="text-xs text-[#8C8C88] truncate">{marketer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#8C8C88]">{marketer.country}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-[#0B0B0C]">{marketer.campaign_count}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={['text-sm font-semibold', marketer.total_spent > 0 ? '' : 'text-[#C4C4C0]'].join(' ')} style={marketer.total_spent > 0 ? { color: '#6E5BFF' } : {}}>
                            {formatCurrency(marketer.total_spent)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#8C8C88]">{formatDate(marketer.created_at)}</td>
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
