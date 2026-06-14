import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ApplicationStatus =
  | 'applied'
  | 'active'
  | 'proof_submitted'
  | 'approved'
  | 'rejected'
  | 'paid'

const VALID_STATUSES: ApplicationStatus[] = [
  'applied',
  'active',
  'proof_submitted',
  'approved',
  'rejected',
  'paid',
]

interface RouteParams {
  params: { id: string }
}

// PATCH /api/applications/[id] — update application status (admin or marketer for their campaigns)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'admin' && profile.role !== 'marketer') {
      return NextResponse.json({ error: 'Forbidden: admin or marketer role required' }, { status: 403 })
    }

    // Fetch the application with campaign to check ownership
    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        influencer_id,
        campaign_id,
        campaigns (
          id,
          marketer_id
        )
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Marketers can only update applications for their own campaigns
    if (profile.role === 'marketer') {
      const campaign = application.campaigns as { id: string; marketer_id: string } | null
      if (!campaign || campaign.marketer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden: you do not own this campaign' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }
    if (!VALID_STATUSES.includes(status as ApplicationStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Marketers are limited to: applied → active, active → rejected
    if (profile.role === 'marketer') {
      const marketerAllowed: ApplicationStatus[] = ['active', 'rejected']
      if (!marketerAllowed.includes(status as ApplicationStatus)) {
        return NextResponse.json(
          { error: 'Marketers can only set status to "active" or "rejected"' },
          { status: 403 }
        )
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select(`
        id,
        status,
        applied_at,
        updated_at,
        campaign_id,
        influencer_id
      `)
      .single()

    if (updateError) {
      console.error('application PATCH error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('application PATCH unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/applications/[id] — fetch single application (influencer, marketer of campaign, or admin)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
        updated_at,
        campaign_id,
        influencer_id,
        campaigns (
          id,
          title,
          description,
          status,
          creative_url,
          marketer_id,
          tiers (
            id,
            name,
            views_target,
            influencer_payout,
            platform_fee,
            total_charge
          )
        ),
        proof_submissions (
          id,
          status,
          screenshot_url,
          video_url,
          ai_view_count,
          ai_confidence,
          ai_is_whatsapp,
          ai_has_creative,
          admin_note,
          submitted_at
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      console.error('application GET [id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Access control: influencer sees only own, marketer sees only own campaigns', admin sees all
    if (profile.role === 'influencer' && application.influencer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (profile.role === 'marketer') {
      const campaign = application.campaigns as { marketer_id: string } | null
      if (!campaign || campaign.marketer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(application)
  } catch (err) {
    console.error('application GET [id] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
