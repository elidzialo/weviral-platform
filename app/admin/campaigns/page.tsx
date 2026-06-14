import { createAdminClient } from '@/lib/supabase/admin'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignRow {
  id: string
  title: string
  status: string
  created_at: string
  marketer: {
    full_name: string
    email: string
  } | null
  tier: {
    name: string
    views_target: number
    influencer_payout: number
    total_charge: number
  } | null
  // Aggregated in code
  proof_view_count?: number
  proof_status?: string
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

function tierVariant(name: string): 'gray' | 'green' | 'amber' | 'red' | 'purple' {
  const lower = name.toLowerCase()
  if (lower.includes('elite')) return 'red'
  if (lower.includes('viral')) return 'purple'
  if (lower.includes('growth')) return 'green'
  return 'gray'
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminCampaignsPage() {
  const adminClient = createAdminClient()

  // Fetch all campaigns with marketer and tier
  const { data: campaignsRaw, error } = await adminClient
    .from('campaigns')
    .select(`
      id,
      title,
      status,
      created_at,
      marketer:profiles!campaigns_marketer_id_fkey (
        full_name,
        email
      ),
      tier:tiers (
        name,
        views_target,
        influencer_payout,
        total_charge
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-700">
          Failed to load campaigns: {error.message}
        </div>
      </div>
    )
  }

  // Fetch latest proof submission per campaign for view count progress
  const { data: proofData } = await adminClient
    .from('proof_submissions')
    .select(`
      status,
      ai_view_count,
      applications (
        campaign_id
      )
    `)
    .order('submitted_at', { ascending: false })

  // Build a map of campaign_id → latest proof
  const proofByCampaign = new Map<string, { viewCount: number; status: string }>()
  for (const proof of proofData ?? []) {
    const app = proof.applications as { campaign_id: string } | null
    if (!app?.campaign_id) continue
    if (!proofByCampaign.has(app.campaign_id)) {
      proofByCampaign.set(app.campaign_id, {
        viewCount: proof.ai_view_count ?? 0,
        status: proof.status,
      })
    }
  }

  const campaigns: CampaignRow[] = (campaignsRaw ?? []).map((c: any) => {
    const proof = proofByCampaign.get(c.id)
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      created_at: c.created_at,
      marketer: c.marketer ?? null,
      tier: c.tier ?? null,
      proof_view_count: proof?.viewCount,
      proof_status: proof?.status,
    }
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">All Campaigns</h1>
        <p className="mt-1 text-sm text-gray-500">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} across all marketers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {campaigns.length} total
          </span>
        </CardHeader>
        <CardBody className="p-0">
          {campaigns.length === 0 ? (
            <EmptyState
              icon="📣"
              title="No campaigns yet"
              description="Campaigns created by marketers will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Marketer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      View Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {campaigns.map((campaign) => {
                    const viewTarget = campaign.tier?.views_target ?? 0
                    const viewCount = campaign.proof_view_count ?? 0
                    const viewProgress =
                      viewTarget > 0 ? Math.min(100, Math.round((viewCount / viewTarget) * 100)) : 0
                    const hasProof = campaign.proof_view_count !== undefined

                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                        {/* Campaign */}
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900 max-w-[220px] truncate">
                            {campaign.title}
                          </p>
                        </td>

                        {/* Marketer */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700">
                            {campaign.marketer?.full_name || campaign.marketer?.email || '—'}
                          </p>
                          {campaign.marketer?.full_name && campaign.marketer.email && (
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">
                              {campaign.marketer.email}
                            </p>
                          )}
                        </td>

                        {/* Tier */}
                        <td className="px-6 py-4">
                          {campaign.tier ? (
                            <Badge variant={tierVariant(campaign.tier.name)}>
                              {campaign.tier.name}
                            </Badge>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {statusBadge(campaign.status)}
                        </td>

                        {/* View Progress */}
                        <td className="px-6 py-4 min-w-[160px]">
                          {hasProof ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {viewCount.toLocaleString()} / {viewTarget.toLocaleString()}
                                </span>
                                <span className="text-xs font-medium text-gray-700">{viewProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={[
                                    'h-1.5 rounded-full transition-all',
                                    viewProgress >= 100
                                      ? 'bg-emerald-500'
                                      : viewProgress >= 50
                                      ? 'bg-amber-400'
                                      : 'bg-red-400',
                                  ].join(' ')}
                                  style={{ width: `${viewProgress}%` }}
                                />
                              </div>
                              {campaign.proof_status && (
                                <div>{statusBadge(campaign.proof_status)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No proof submitted</span>
                          )}
                        </td>

                        {/* Value */}
                        <td className="px-6 py-4">
                          {campaign.tier ? (
                            <span className="text-sm font-medium text-gray-700">
                              {formatCurrency(Number(campaign.tier.total_charge))}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {formatDate(campaign.created_at)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
