import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import BarChart from '@/components/ui/BarChart'

export const dynamic = 'force-dynamic'

interface PendingApproval {
  id: string
  submitted_at: string
  ai_view_count: number
  ai_confidence: number
  applications: {
    influencer_id: string
    campaigns: {
      title: string
      tiers: { name: string; views_target: number } | null
    } | null
    influencer: { full_name: string; whatsapp_handle: string | null } | null
  } | null
}

interface ActivityEvent {
  id: string
  type: 'proof' | 'payout'
  date: string
  label: string
  sub: string
  status?: string
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return '£' + (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(amount)
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function AdminDashboardPage() {
  const adminClient = createAdminClient()

  const [
    influencerCountResult,
    marketerCountResult,
    pendingProofsResult,
    payoutsResult,
    revenueResult,
    recentApprovalsResult,
    recentProofsResult,
    recentPayoutsResult,
  ] = await Promise.all([
    adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'influencer'),
    adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'marketer'),
    adminClient.from('proof_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('payouts').select('amount'),
    adminClient.from('proof_submissions').select('applications(campaigns(tiers(platform_fee)))').eq('status', 'approved'),
    adminClient
      .from('proof_submissions')
      .select(`id,submitted_at,ai_view_count,ai_confidence,applications(influencer_id,campaigns(title,tiers(name,views_target)),influencer:profiles!applications_influencer_id_fkey(full_name,whatsapp_handle))`)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
      .limit(3),
    adminClient
      .from('proof_submissions')
      .select(`id,submitted_at,status,ai_view_count,applications(campaigns(title),influencer:profiles!applications_influencer_id_fkey(full_name))`)
      .order('submitted_at', { ascending: false })
      .limit(5),
    adminClient
      .from('payouts')
      .select(`id,amount,created_at,influencer:profiles!payouts_influencer_id_fkey(full_name)`)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const influencerCount = influencerCountResult.count ?? 0
  const marketerCount = marketerCountResult.count ?? 0
  const pendingCount = pendingProofsResult.count ?? 0
  const totalDisbursed = (payoutsResult.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
  const totalRevenue = (revenueResult.data ?? []).reduce((sum, submission) => {
    const fee = (submission as any)?.applications?.campaigns?.tiers?.platform_fee
    return sum + (fee ? Number(fee) : 0)
  }, 0)
  const platformRevenue = totalDisbursed + totalRevenue
  const totalUsers = influencerCount + marketerCount

  const pendingApprovals = (recentApprovalsResult.data ?? []) as unknown as PendingApproval[]

  const proofEvents: ActivityEvent[] = (recentProofsResult.data ?? []).map((p: any) => ({
    id: `proof-${p.id}`,
    type: 'proof',
    date: p.submitted_at,
    label: `${p.applications?.influencer?.full_name ?? 'Unknown'} submitted proof`,
    sub: p.applications?.campaigns?.title ?? 'Unknown campaign',
    status: p.status,
  }))

  const payoutEvents: ActivityEvent[] = (recentPayoutsResult.data ?? []).map((p: any) => ({
    id: `payout-${p.id}`,
    type: 'payout',
    date: p.created_at,
    label: `Payout of ${formatCurrencyFull(Number(p.amount))} sent`,
    sub: (p.influencer as any)?.full_name ?? 'Unknown influencer',
  }))

  const activityFeed = [...proofEvents, ...payoutEvents]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  // Sample weekly revenue data for chart (7 days Mon→Sun relative to total)
  const chartData = [
    { label: 'Mon', value: totalDisbursed * 0.11 },
    { label: 'Tue', value: totalDisbursed * 0.15 },
    { label: 'Wed', value: totalDisbursed * 0.18 },
    { label: 'Thu', value: totalDisbursed * 0.14 },
    { label: 'Fri', value: totalDisbursed * 0.20 },
    { label: 'Sat', value: totalDisbursed * 0.13 },
    { label: 'Sun', value: totalDisbursed * 0.09 },
  ]

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <div
        className="sticky top-0 z-10 px-8 py-4 border-b border-[#ECECE8]"
        style={{ background: 'rgba(246,246,243,.85)', backdropFilter: 'blur(14px)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#0B0B0C] leading-tight">Platform Overview</h1>
            <p className="text-[13px] text-[#8C8C88]">Super Admin · Real-time metrics</p>
          </div>
          {pendingCount > 0 && (
            <Link
              href="/admin/approvals"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(90deg, #6E5BFF, #4D7CFF)' }}
            >
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/25 text-xs font-bold"
              >
                {pendingCount}
              </span>
              Review Proofs
            </Link>
          )}
        </div>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total GMV"
            value={formatCurrency(platformRevenue)}
            sub="All-time platform volume"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M9 9.5h4.5a1.6 1.6 0 010 3.2H9m0-3.2v6.5m0-6.5V8" />
              </svg>
            }
          />
          <StatCard
            label="Total Payouts"
            value={formatCurrency(totalDisbursed)}
            sub="Paid to influencers"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18v11H3zM16 13h3M3 8l2.5-3h13L21 8" />
              </svg>
            }
          />
          <StatCard
            label="Total Users"
            value={totalUsers.toLocaleString()}
            sub={`${influencerCount} influencers · ${marketerCount} marketers`}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <StatCard
            label="Pending Proofs"
            value={pendingCount.toLocaleString()}
            sub="Awaiting admin review"
            className={pendingCount > 0 ? 'border-[#6E5BFF]/30' : ''}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Chart + Activity row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
          <BarChart
            data={chartData}
            title="Weekly Payouts"
            subtitle="Distribution across the week"
            formatValue={formatCurrencyFull}
          />

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {activityFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                  <p className="text-sm font-medium text-[#0B0B0C]">No activity yet</p>
                  <p className="text-xs text-[#8C8C88] mt-1">Proof submissions and payouts will appear here.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#ECECE8]">
                  {activityFeed.map((event) => (
                    <li key={event.id} className="px-5 py-3.5 flex items-start gap-3">
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs mt-0.5"
                        style={{
                          background: event.type === 'payout' ? 'rgba(31,211,163,0.1)' : 'rgba(110,91,255,0.08)',
                          color: event.type === 'payout' ? '#1FD3A3' : '#6E5BFF',
                        }}
                      >
                        {event.type === 'payout' ? '£' : '↑'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#0B0B0C] truncate">{event.label}</p>
                        <p className="text-xs text-[#8C8C88] mt-0.5 truncate">{event.sub}</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <span className="text-xs text-[#8C8C88]">{timeAgo(event.date)}</span>
                        {event.status && statusBadge(event.status)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Pending Approvals table */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            {pendingCount > 0 && (
              <Link
                href="/admin/approvals"
                className="text-[13px] font-semibold"
                style={{ color: '#6E5BFF' }}
              >
                View all {pendingCount} →
              </Link>
            )}
          </CardHeader>
          <CardBody className="p-0">
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                  style={{ background: 'rgba(31,211,163,0.08)', color: '#1FD3A3' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#0B0B0C]">All caught up!</p>
                <p className="text-xs text-[#8C8C88] mt-1">No pending approvals right now.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#ECECE8]">
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Campaign</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Influencer</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Tier</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">AI Views</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold text-[#8C8C88] uppercase tracking-wider">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECECE8]">
                    {pendingApprovals.map((submission) => {
                      const app = submission.applications
                      const campaign = app?.campaigns
                      const tier = campaign?.tiers
                      const influencer = (app as any)?.influencer
                      return (
                        <tr key={submission.id} className="hover:bg-[#F6F6F3] transition-colors">
                          <td className="px-6 py-4 font-medium text-[#0B0B0C] truncate max-w-[200px]">
                            {campaign?.title ?? 'Unknown Campaign'}
                          </td>
                          <td className="px-6 py-4 text-[#8C8C88]">
                            @{influencer?.whatsapp_handle ?? influencer?.full_name ?? 'Unknown'}
                          </td>
                          <td className="px-6 py-4">
                            {tier && <Badge variant="purple">{tier.name}</Badge>}
                          </td>
                          <td className="px-6 py-4 font-mono text-[#0B0B0C]">
                            {submission.ai_view_count.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-[#8C8C88]">
                            {formatDate(submission.submitted_at)}
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
    </div>
  )
}
