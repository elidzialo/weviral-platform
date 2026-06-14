import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export default async function AdminInfluencersPage() {
  const adminClient = createAdminClient()

  // Fetch all influencer profiles
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

  // Fetch campaign counts and earnings in parallel
  const [applicationsResult, payoutsResult] = await Promise.all([
    influencerIds.length > 0
      ? adminClient
          .from('applications')
          .select('influencer_id, status')
          .in('influencer_id', influencerIds)
      : Promise.resolve({ data: [], error: null }),

    influencerIds.length > 0
      ? adminClient
          .from('payouts')
          .select('influencer_id, amount')
          .in('influencer_id', influencerIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  // Build maps
  const campaignCountMap = new Map<string, number>()
  for (const app of applicationsResult.data ?? []) {
    campaignCountMap.set(
      app.influencer_id,
      (campaignCountMap.get(app.influencer_id) ?? 0) + 1,
    )
  }

  const earningsMap = new Map<string, number>()
  for (const payout of payoutsResult.data ?? []) {
    earningsMap.set(
      payout.influencer_id,
      (earningsMap.get(payout.influencer_id) ?? 0) + Number(payout.amount),
    )
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Influencers</h1>
        <p className="mt-1 text-sm text-gray-500">
          {influencers.length} registered influencer{influencers.length !== 1 ? 's' : ''}
          {' '}· {onboardedCount} Stripe-onboarded
          {' '}· {formatCurrency(totalEarnings)} total disbursed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Influencers</CardTitle>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {influencers.length} total
          </span>
        </CardHeader>
        <CardBody className="p-0">
          {influencers.length === 0 ? (
            <EmptyState
              icon="📱"
              title="No influencers yet"
              description="Registered influencers will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Influencer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      WhatsApp Handle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Campaigns
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total Earned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stripe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {influencers.map((influencer) => (
                    <tr key={influencer.id} className="hover:bg-gray-50 transition-colors">
                      {/* Name + Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold select-none">
                            {getInitials(influencer.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {influencer.full_name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{influencer.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* WhatsApp Handle */}
                      <td className="px-6 py-4">
                        {influencer.whatsapp_handle ? (
                          <span className="text-sm text-gray-700 font-mono">
                            @{influencer.whatsapp_handle}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>

                      {/* Country */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{influencer.country}</span>
                      </td>

                      {/* Campaigns */}
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {influencer.campaign_count}
                        </span>
                      </td>

                      {/* Total Earned */}
                      <td className="px-6 py-4">
                        <span
                          className={[
                            'text-sm font-semibold',
                            influencer.total_earned > 0 ? 'text-emerald-700' : 'text-gray-400',
                          ].join(' ')}
                        >
                          {influencer.total_earned > 0
                            ? formatCurrency(influencer.total_earned)
                            : '£0.00'}
                        </span>
                      </td>

                      {/* Stripe status */}
                      <td className="px-6 py-4">
                        {influencer.stripe_onboarded ? (
                          <Badge variant="green">Onboarded</Badge>
                        ) : (
                          <Badge variant="amber">Pending</Badge>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {formatDate(influencer.created_at)}
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
