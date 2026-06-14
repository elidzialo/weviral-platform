import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarketerRow {
  id: string
  full_name: string
  email: string
  country: string
  created_at: string
  campaign_count: number
  total_spent: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount)
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminMarketersPage() {
  const adminClient = createAdminClient()

  // Fetch all marketer profiles
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

  // Fetch campaign data for spend calculations
  const { data: campaignsRaw } = marketerIds.length > 0
    ? await adminClient
        .from('campaigns')
        .select(`
          marketer_id,
          status,
          tiers (
            total_charge
          )
        `)
        .in('marketer_id', marketerIds)
    : { data: [] }

  // Build aggregates per marketer
  const campaignCountMap = new Map<string, number>()
  const totalSpentMap = new Map<string, number>()

  for (const campaign of campaignsRaw ?? []) {
    const mid = (campaign as any).marketer_id
    campaignCountMap.set(mid, (campaignCountMap.get(mid) ?? 0) + 1)

    // Only count paid campaigns (non-draft) as "spent"
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Marketers</h1>
        <p className="mt-1 text-sm text-gray-500">
          {marketers.length} registered marketer{marketers.length !== 1 ? 's' : ''}
          {' '}· {formatCurrency(totalSpentAll)} total platform spend
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Marketers</CardTitle>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {marketers.length} total
          </span>
        </CardHeader>
        <CardBody className="p-0">
          {marketers.length === 0 ? (
            <EmptyState
              icon="💼"
              title="No marketers yet"
              description="Registered marketers will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Marketer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Campaigns
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {marketers.map((marketer) => (
                    <tr key={marketer.id} className="hover:bg-gray-50 transition-colors">
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold select-none">
                            {getInitials(marketer.full_name)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {marketer.full_name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 truncate max-w-[220px] block">
                          {marketer.email}
                        </span>
                      </td>

                      {/* Country */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{marketer.country}</span>
                      </td>

                      {/* Campaigns */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {marketer.campaign_count}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="px-6 py-4">
                        <span
                          className={[
                            'text-sm font-semibold',
                            marketer.total_spent > 0 ? 'text-violet-700' : 'text-gray-400',
                          ].join(' ')}
                        >
                          {marketer.total_spent > 0
                            ? formatCurrency(marketer.total_spent)
                            : '£0.00'}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {formatDate(marketer.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
