import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminDashboardPage() {
  const adminClient = createAdminClient()

  // Fetch all counts and aggregates in parallel
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
    // Influencer count
    adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'influencer'),

    // Marketer count
    adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'marketer'),

    // Pending proofs count
    adminClient
      .from('proof_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    // Total disbursed payouts
    adminClient.from('payouts').select('amount'),

    // Platform revenue from approved submissions
    adminClient
      .from('proof_submissions')
      .select('applications(campaigns(tiers(platform_fee)))')
      .eq('status', 'approved'),

    // Top 3 pending approvals for the quick review card
    adminClient
      .from('proof_submissions')
      .select(`
        id,
        submitted_at,
        ai_view_count,
        ai_confidence,
        applications (
          influencer_id,
          campaigns (
            title,
            tiers ( name, views_target )
          ),
          influencer:profiles!applications_influencer_id_fkey (
            full_name,
            whatsapp_handle
          )
        )
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
      .limit(3),

    // Recent proof submissions (latest 5)
    adminClient
      .from('proof_submissions')
      .select(`
        id,
        submitted_at,
        status,
        ai_view_count,
        applications (
          campaigns ( title ),
          influencer:profiles!applications_influencer_id_fkey ( full_name )
        )
      `)
      .order('submitted_at', { ascending: false })
      .limit(5),

    // Recent payouts (latest 5)
    adminClient
      .from('payouts')
      .select(`
        id,
        amount,
        created_at,
        influencer:profiles!payouts_influencer_id_fkey ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Compute stats
  const influencerCount = influencerCountResult.count ?? 0
  const marketerCount = marketerCountResult.count ?? 0
  const pendingCount = pendingProofsResult.count ?? 0

  const totalDisbursed = (payoutsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  )

  const totalRevenue = (revenueResult.data ?? []).reduce((sum, submission) => {
    const fee = (submission as any)?.applications?.campaigns?.tiers?.platform_fee
    return sum + (fee ? Number(fee) : 0)
  }, 0)

  const platformRevenue = totalDisbursed + totalRevenue

  // Pending approvals list
  const pendingApprovals = (recentApprovalsResult.data ?? []) as unknown as PendingApproval[]

  // Build activity feed from proof submissions + payouts merged and sorted by date
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
    label: `Payout of ${formatCurrency(Number(p.amount))} sent`,
    sub: (p.influencer as any)?.full_name ?? 'Unknown influencer',
  }))

  const activityFeed = [...proofEvents, ...payoutEvents]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview and pending actions
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="Influencers"
          value={influencerCount.toLocaleString()}
          sub="Total registered"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        <StatCard
          label="Marketers"
          value={marketerCount.toLocaleString()}
          sub="Total registered"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />

        <StatCard
          label="Pending Approvals"
          value={pendingCount.toLocaleString()}
          sub="Awaiting review"
          className={pendingCount > 0 ? 'border-amber-300 bg-amber-50' : ''}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          label="Platform Revenue"
          value={formatCurrency(platformRevenue)}
          sub="All time"
          className="border-emerald-300 bg-emerald-50"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals Card */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                {pendingCount}
              </span>
            )}
          </CardHeader>
          <CardBody className="p-0">
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <span className="text-4xl mb-3 select-none">✅</span>
                <p className="text-sm font-medium text-gray-700">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No pending approvals right now.</p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-100">
                  {pendingApprovals.map((submission) => {
                    const app = submission.applications
                    const campaign = app?.campaigns
                    const tier = campaign?.tiers
                    const influencer = (app as any)?.influencer

                    return (
                      <li key={submission.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {campaign?.title ?? 'Unknown Campaign'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              @{influencer?.whatsapp_handle ?? influencer?.full_name ?? 'Unknown'}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {tier && (
                                <Badge variant="purple">{tier.name}</Badge>
                              )}
                              <span className="text-xs text-gray-400">
                                {submission.ai_view_count.toLocaleString()} views detected
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                            {formatDate(submission.submitted_at)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                  <Link
                    href="/admin/approvals"
                    className="text-sm font-medium text-violet-700 hover:text-violet-900 transition-colors"
                  >
                    Review all {pendingCount} pending {pendingCount === 1 ? 'submission' : 'submissions'} →
                  </Link>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* Activity Feed Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {activityFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <span className="text-4xl mb-3 select-none">📋</span>
                <p className="text-sm font-medium text-gray-700">No activity yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Proof submissions and payouts will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activityFeed.map((event) => (
                  <li key={event.id} className="px-6 py-4 flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={[
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm mt-0.5',
                        event.type === 'payout'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-violet-100 text-violet-700',
                      ].join(' ')}
                    >
                      {event.type === 'payout' ? '£' : '📎'}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{event.sub}</p>
                    </div>

                    {/* Right side */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400">{timeAgo(event.date)}</span>
                      {event.status && statusBadge(event.status)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
