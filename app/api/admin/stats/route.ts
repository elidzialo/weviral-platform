import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/stats — admin dashboard statistics
export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 })
    }

    // Use admin client to bypass RLS for aggregation queries
    const adminClient = createAdminClient()

    // Run all counts in parallel for performance
    const [
      profilesResult,
      campaignsResult,
      pendingProofsResult,
      payoutsResult,
      applicationsResult,
    ] = await Promise.all([
      // Count profiles by role
      adminClient
        .from('profiles')
        .select('role', { count: 'exact', head: false }),

      // Count campaigns by status
      adminClient
        .from('campaigns')
        .select('status', { count: 'exact', head: false }),

      // Count pending proof submissions
      adminClient
        .from('proof_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Sum payouts (total paid to influencers)
      adminClient
        .from('payouts')
        .select('amount'),

      // Count applications by status
      adminClient
        .from('applications')
        .select('status', { count: 'exact', head: false }),
    ])

    // Check for errors
    if (profilesResult.error) {
      console.error('stats profiles error:', profilesResult.error)
      return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })
    }
    if (campaignsResult.error) {
      console.error('stats campaigns error:', campaignsResult.error)
      return NextResponse.json({ error: campaignsResult.error.message }, { status: 500 })
    }
    if (pendingProofsResult.error) {
      console.error('stats pending proofs error:', pendingProofsResult.error)
      return NextResponse.json({ error: pendingProofsResult.error.message }, { status: 500 })
    }
    if (payoutsResult.error) {
      console.error('stats payouts error:', payoutsResult.error)
      return NextResponse.json({ error: payoutsResult.error.message }, { status: 500 })
    }
    if (applicationsResult.error) {
      console.error('stats applications error:', applicationsResult.error)
      return NextResponse.json({ error: applicationsResult.error.message }, { status: 500 })
    }

    // Aggregate profiles by role
    const profileRows = profilesResult.data ?? []
    const profilesByRole = profileRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = (acc[row.role] ?? 0) + 1
      return acc
    }, {})

    // Aggregate campaigns by status
    const campaignRows = campaignsResult.data ?? []
    const campaignsByStatus = campaignRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1
      return acc
    }, {})

    // Aggregate applications by status
    const applicationRows = applicationsResult.data ?? []
    const applicationsByStatus = applicationRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1
      return acc
    }, {})

    // Sum total payouts disbursed to influencers
    const payoutRows = payoutsResult.data ?? []
    const totalPayoutsDisbursed = payoutRows.reduce(
      (sum, row) => sum + Number(row.amount),
      0
    )

    // Also fetch platform fee totals from approved proof submissions joined with tiers
    const { data: approvedSubmissions, error: revenueError } = await adminClient
      .from('proof_submissions')
      .select(`
        applications (
          campaigns (
            tiers (
              platform_fee
            )
          )
        )
      `)
      .eq('status', 'approved')

    if (revenueError) {
      console.error('stats revenue error:', revenueError)
      return NextResponse.json({ error: revenueError.message }, { status: 500 })
    }

    // Calculate total platform revenue from approved submissions
    const totalPlatformRevenue = (approvedSubmissions ?? []).reduce((sum, submission) => {
      const app = submission.applications as {
        campaigns: {
          tiers: { platform_fee: number } | null
        } | null
      } | null
      const fee = app?.campaigns?.tiers?.platform_fee
      return sum + (fee ? Number(fee) : 0)
    }, 0)

    return NextResponse.json({
      users: {
        total: profileRows.length,
        influencers: profilesByRole['influencer'] ?? 0,
        marketers: profilesByRole['marketer'] ?? 0,
        admins: profilesByRole['admin'] ?? 0,
      },
      campaigns: {
        total: campaignRows.length,
        draft: campaignsByStatus['draft'] ?? 0,
        active: campaignsByStatus['active'] ?? 0,
        completed: campaignsByStatus['completed'] ?? 0,
        cancelled: campaignsByStatus['cancelled'] ?? 0,
      },
      applications: {
        total: applicationRows.length,
        applied: applicationsByStatus['applied'] ?? 0,
        active: applicationsByStatus['active'] ?? 0,
        proof_submitted: applicationsByStatus['proof_submitted'] ?? 0,
        approved: applicationsByStatus['approved'] ?? 0,
        rejected: applicationsByStatus['rejected'] ?? 0,
        paid: applicationsByStatus['paid'] ?? 0,
      },
      proofs: {
        pending_review: pendingProofsResult.count ?? 0,
      },
      financials: {
        total_payouts_disbursed: Number(totalPayoutsDisbursed.toFixed(2)),
        total_platform_revenue: Number(totalPlatformRevenue.toFixed(2)),
        total_payout_count: payoutRows.length,
        approved_submissions_count: (approvedSubmissions ?? []).length,
      },
    })
  } catch (err) {
    console.error('admin stats unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
