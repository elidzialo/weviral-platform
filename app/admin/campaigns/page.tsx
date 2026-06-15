import { createAdminClient } from '@/lib/supabase/admin'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'

interface CampaignRow {
  id: string
  title: string
  status: string
  created_at: string
  marketer: { full_name: string; email: string } | null
  tier: { name: string; views_target: number; influencer_payout: number; total_charge: number } | null
  proof_view_count?: number
  proof_status?: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(amount)
}

function tierVariant(name: string): 'gray' | 'green' | 'amber' | 'red' | 'purple' {
  const l = name.toLowerCase()
  if (l.includes('elite')) return 'red'
  if (l.includes('viral')) return 'purple'
  if (l.includes('growth')) return 'green'
  return 'gray'
}

export default async function AdminCampaignsPage() {
  const adminClient = createAdminClient()

  const { data: campaignsRaw, error } = await adminClient
    .from('campaigns')
    .select(`id,title,status,created_at,marketer:profiles!campaigns_marketer_id_fkey(full_name,email),tier:tiers(name,views_target,influencer_payout,total_charge)`)
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

  const { data: proofData } = await adminClient
    .from('proof_submissions')
    .select(`status,ai_view_count,applications(campaign_id)`)
    .order('submitted_at', { ascending: false })

  const proofByCampaign = new Map<string, { viewCount: number; status: string }>()
  for (const proof of proofData ?? []) {
    const app = proof.applications as { campaign_id: string } | null
    if (!app?.campaign_id) continue
    if (!proofByCampaign.has(app.campaign_id)) {
      proofByCampaign.set(app.campaign_id, { viewCount: proof.ai_view_count ?? 0, status: proof.status })
    }
  }

  const campaigns: CampaignRow[] = (campaignsRaw ?? []).map((c: any) => {
    const proof = proofByCampaign.get(c.id)
    return { id: c.id, title: c.title, status: c.status, created_at: c.created_at, marketer: c.marketer ?? null, tier: c.tier ?? null, proof_view_count: proof?.viewCount, proof_status: proof?.status }
  })

  return (
    <div className="p-8">
      {/* Topbar */}
      <div
        className="sticky top-0 z-10 px-0 py-4 mb-6 border-b border-[#ECECE8]"
        style={{ background: 'rgba(246,246,243,.85)', backdropFilter: 'blur(14px)' }}
      >
        <h1 className="text-lg font-bold text-[#0B0B0C]">All Campaigns</h1>
        <p className="text-[13px] text-[#8C8C88]">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} across all marketers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F6F6F3] text-[#8C8C88]">
            {campaigns.length} total
          </span>
        </CardHeader>
        <CardBody className="p-0">
          {campaigns.length === 0 ? (
            <EmptyState icon="📣" title="No campaigns yet" description="Campaigns created by marketers will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#ECECE8]">
                    {['Campaign', 'Marketer', 'Tier', 'Status', 'View Progress', 'Value', 'Created'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECECE8]">
                  {campaigns.map((campaign) => {
                    const viewTarget = campaign.tier?.views_target ?? 0
                    const viewCount = campaign.proof_view_count ?? 0
                    const viewProgress = viewTarget > 0 ? Math.min(100, Math.round((viewCount / viewTarget) * 100)) : 0
                    const hasProof = campaign.proof_view_count !== undefined

                    return (
                      <tr key={campaign.id} className="hover:bg-[#F6F6F3] transition-colors">
                        <td className="px-6 py-4 font-medium text-[#0B0B0C] truncate max-w-[220px]">{campaign.title}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-[#0B0B0C]">{campaign.marketer?.full_name || campaign.marketer?.email || '—'}</p>
                          {campaign.marketer?.full_name && campaign.marketer.email && (
                            <p className="text-xs text-[#8C8C88] truncate max-w-[180px]">{campaign.marketer.email}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {campaign.tier ? <Badge variant={tierVariant(campaign.tier.name)}>{campaign.tier.name}</Badge> : <span className="text-[#8C8C88] text-sm">—</span>}
                        </td>
                        <td className="px-6 py-4">{statusBadge(campaign.status)}</td>
                        <td className="px-6 py-4 min-w-[160px]">
                          {hasProof ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-[#8C8C88]">{viewCount.toLocaleString()} / {viewTarget.toLocaleString()}</span>
                                <span className="text-xs font-semibold text-[#0B0B0C]">{viewProgress}%</span>
                              </div>
                              <div className="w-full bg-[#ECECE8] rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full transition-all"
                                  style={{
                                    width: `${viewProgress}%`,
                                    background: viewProgress >= 100 ? '#1FD3A3' : viewProgress >= 50 ? '#6E5BFF' : '#F59E0B',
                                  }}
                                />
                              </div>
                              {campaign.proof_status && <div>{statusBadge(campaign.proof_status)}</div>}
                            </div>
                          ) : (
                            <span className="text-xs text-[#8C8C88]">No proof submitted</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {campaign.tier ? (
                            <span className="text-sm font-semibold text-[#0B0B0C]">{formatCurrency(Number(campaign.tier.total_charge))}</span>
                          ) : (
                            <span className="text-[#8C8C88] text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#8C8C88]">{formatDate(campaign.created_at)}</td>
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
