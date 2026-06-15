import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

interface Tier {
  id: string; name: string; views_target: number
  influencer_payout: number; platform_fee: number; total_charge: number
}
interface ProofSubmission { id: string; ai_view_count: number; status: string; submitted_at: string }
interface Application { id: string; status: string; applied_at: string; proof_submissions: ProofSubmission[] }
interface Campaign {
  id: string; title: string; description: string; status: string
  creative_url: string | null; created_at: string; updated_at: string
  tiers: Tier | null; applications: Application[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(amount)
}
function formatNumber(n: number) { return new Intl.NumberFormat('en-GB').format(n) }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function getTierBadgeVariant(name: string): 'green' | 'purple' | 'amber' | 'gray' {
  const map: Record<string, 'green' | 'purple' | 'amber' | 'gray'> = { Starter: 'gray', Growth: 'amber', Viral: 'purple', Elite: 'green' }
  return map[name] ?? 'gray'
}
function getTierIcon(name: string) {
  return ({ Starter: '🌱', Growth: '📈', Viral: '🚀', Elite: '👑' } as Record<string, string>)[name] ?? '📦'
}
function getCampaignVerifiedViews(campaign: Campaign) {
  return campaign.applications.reduce((sum, app) =>
    sum + app.proof_submissions.filter(p => p.status === 'approved').reduce((s, p) => s + p.ai_view_count, 0), 0)
}
function hasPendingProof(campaign: Campaign) {
  return campaign.applications.some(app => app.proof_submissions.some(p => p.status === 'pending'))
}
function getApplicantCounts(campaign: Campaign) {
  return {
    total: campaign.applications.length,
    active: campaign.applications.filter(a => a.status === 'active' || a.status === 'proof_submitted').length,
    approved: campaign.applications.filter(a => a.status === 'approved' || a.status === 'paid').length,
  }
}

export default async function MarketerCampaignsPage({ searchParams }: { searchParams: { success?: string } }) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`id,title,description,status,creative_url,created_at,updated_at,tiers(id,name,views_target,influencer_payout,platform_fee,total_charge),applications(id,status,applied_at,proof_submissions(id,ai_view_count,status,submitted_at))`)
    .eq('marketer_id', user.id)
    .order('created_at', { ascending: false })

  const allCampaigns: Campaign[] = (campaigns as Campaign[]) ?? []
  const showSuccess = searchParams.success === '1'
  const activeCampaigns = allCampaigns.filter(c => c.status === 'active')
  const draftCampaigns = allCampaigns.filter(c => c.status === 'draft')
  const completedCampaigns = allCampaigns.filter(c => c.status === 'completed')

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <div
        className="sticky top-0 z-10 px-8 py-4 border-b border-[#ECECE8]"
        style={{ background: 'rgba(246,246,243,.85)', backdropFilter: 'blur(14px)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#0B0B0C]">My Campaigns</h1>
            <p className="text-[13px] text-[#8C8C88]">
              {allCampaigns.length} total · {activeCampaigns.length} active · {draftCampaigns.length} draft · {completedCampaigns.length} completed
            </p>
          </div>
          <Link
            href="/marketer/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(120deg,#6E5BFF,#4D7CFF)', boxShadow: '0 4px 14px rgba(98,92,255,.3)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </Link>
        </div>
      </div>

      <div className="px-8 py-7 space-y-4">
        {showSuccess && (
          <div className="flex items-start gap-3 p-4 rounded-xl text-sm border" style={{ background: 'rgba(31,211,163,.08)', borderColor: 'rgba(31,211,163,.3)', color: '#0F7A5A' }}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Payment successful!</p>
              <p className="mt-0.5 opacity-80">Your campaign is now live and influencers can apply.</p>
            </div>
          </div>
        )}

        {allCampaigns.length === 0 ? (
          <Card>
            <CardBody>
              <div className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(110,91,255,.08)' }}>
                  <svg className="w-8 h-8" style={{ color: '#6E5BFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-[#0B0B0C]">No campaigns yet</p>
                  <p className="text-sm text-[#8C8C88] mt-1">Create your first campaign to start getting verified WhatsApp views.</p>
                </div>
                <Link
                  href="/marketer/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(120deg,#6E5BFF,#4D7CFF)' }}
                >
                  Create Campaign
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          allCampaigns.map((campaign) => {
            const verifiedViews = getCampaignVerifiedViews(campaign)
            const viewsTarget = campaign.tiers?.views_target ?? 0
            const progressPct = viewsTarget > 0 ? Math.min(100, (verifiedViews / viewsTarget) * 100) : 0
            const pending = hasPendingProof(campaign)
            const counts = getApplicantCounts(campaign)

            return (
              <div
                key={campaign.id}
                className="bg-white rounded-2xl overflow-hidden transition-shadow hover:shadow-md"
                style={{ border: '1px solid #ECECE8', boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.04)' }}
              >
                <div className="px-6 py-4 flex items-start justify-between gap-4 border-b border-[#ECECE8]">
                  <div className="flex items-start gap-3 min-w-0">
                    {campaign.tiers && <span className="text-xl flex-shrink-0 mt-0.5">{getTierIcon(campaign.tiers.name)}</span>}
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold text-[#0B0B0C] truncate">{campaign.title}</h3>
                      {campaign.description && <p className="text-sm text-[#8C8C88] mt-0.5 line-clamp-1">{campaign.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {pending && <Badge variant="amber">Proof Under Review</Badge>}
                    {statusBadge(campaign.status)}
                    {campaign.tiers && <Badge variant={getTierBadgeVariant(campaign.tiers.name)}>{campaign.tiers.name}</Badge>}
                  </div>
                </div>

                <div className="px-6 py-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <p className="text-[11px] text-[#8C8C88] uppercase tracking-wider font-semibold mb-1">Applicants</p>
                      <p className="text-[22px] font-black text-[#0B0B0C] tracking-tight">{counts.total}</p>
                      <p className="text-xs text-[#8C8C88] mt-0.5">{counts.active} active · {counts.approved} approved</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] text-[#8C8C88] uppercase tracking-wider font-semibold mb-1">Verified Views</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-[#0B0B0C]">{formatNumber(verifiedViews)}</span>
                            <span className="text-[#8C8C88]">/ {formatNumber(viewsTarget)} target</span>
                          </div>
                          <div className="w-full bg-[#ECECE8] rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${progressPct}%`,
                                background: progressPct >= 100 ? '#1FD3A3' : 'linear-gradient(90deg,#6E5BFF,#4D7CFF)',
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#0B0B0C] flex-shrink-0">{progressPct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#8C8C88] uppercase tracking-wider font-semibold mb-1">Total Cost</p>
                      <p className="text-[22px] font-black text-[#0B0B0C] tracking-tight">
                        {campaign.tiers ? formatCurrency(campaign.tiers.total_charge) : '—'}
                      </p>
                      {campaign.tiers && (
                        <p className="text-xs text-[#8C8C88] mt-0.5">Influencer gets {formatCurrency(campaign.tiers.influencer_payout)}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 bg-[#F6F6F3] border-t border-[#ECECE8] flex items-center justify-between">
                  <p className="text-xs text-[#8C8C88]">Created {formatDate(campaign.created_at)}</p>
                  {campaign.status === 'draft' && (
                    <Link href="/marketer/create" className="text-xs font-semibold" style={{ color: '#6E5BFF' }}>
                      Complete payment to launch →
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
