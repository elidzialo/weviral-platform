import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/applications — role-scoped application listing
export async function GET(_request: NextRequest) {
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

    const joinFragment = `
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
        tiers (
          id,
          name,
          views_target,
          influencer_payout,
          platform_fee,
          total_charge
        ),
        profiles!campaigns_marketer_id_fkey (
          id,
          full_name,
          avatar_url
        )
      )
    `

    if (profile.role === 'influencer') {
      const { data: applications, error } = await supabase
        .from('applications')
        .select(joinFragment)
        .eq('influencer_id', user.id)
        .order('applied_at', { ascending: false })

      if (error) {
        console.error('applications GET influencer error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(applications)
    }

    if (profile.role === 'marketer') {
      // Get marketer's campaign IDs first
      const { data: marketerCampaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('marketer_id', user.id)

      if (campaignsError) {
        console.error('applications GET marketer campaigns error:', campaignsError)
        return NextResponse.json({ error: campaignsError.message }, { status: 500 })
      }

      const campaignIds = (marketerCampaigns ?? []).map((c) => c.id)

      if (campaignIds.length === 0) {
        return NextResponse.json([])
      }

      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          ${joinFragment},
          profiles!applications_influencer_id_fkey (
            id,
            full_name,
            avatar_url,
            whatsapp_handle,
            country
          )
        `)
        .in('campaign_id', campaignIds)
        .order('applied_at', { ascending: false })

      if (error) {
        console.error('applications GET marketer error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(applications)
    }

    if (profile.role === 'admin') {
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          ${joinFragment},
          profiles!applications_influencer_id_fkey (
            id,
            full_name,
            avatar_url,
            whatsapp_handle,
            country,
            stripe_account_id,
            stripe_onboarded
          )
        `)
        .order('applied_at', { ascending: false })

      if (error) {
        console.error('applications GET admin error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(applications)
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (err) {
    console.error('applications GET unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/applications — apply to a campaign (influencer only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify influencer role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, stripe_account_id, stripe_onboarded')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.role !== 'influencer') {
      return NextResponse.json({ error: 'Forbidden: influencer role required' }, { status: 403 })
    }

    const body = await request.json()
    const { campaign_id } = body

    if (!campaign_id || typeof campaign_id !== 'string') {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    // Verify the campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    if (campaign.status !== 'active') {
      return NextResponse.json({ error: 'Campaign is not currently accepting applications' }, { status: 400 })
    }

    // Check if already applied
    const { data: existing, error: existingError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('campaign_id', campaign_id)
      .eq('influencer_id', user.id)
      .maybeSingle()

    if (existingError) {
      console.error('applications POST existing check error:', existingError)
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }
    if (existing) {
      return NextResponse.json(
        { error: 'You have already applied to this campaign', existing_application_id: existing.id },
        { status: 409 }
      )
    }

    const { data: application, error: insertError } = await supabase
      .from('applications')
      .insert({
        campaign_id,
        influencer_id: user.id,
        status: 'applied',
      })
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
          tiers (
            id,
            name,
            views_target,
            influencer_payout,
            platform_fee,
            total_charge
          )
        )
      `)
      .single()

    if (insertError) {
      // Handle unique constraint violation gracefully
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already applied to this campaign' }, { status: 409 })
      }
      console.error('applications POST insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(application, { status: 201 })
  } catch (err) {
    console.error('applications POST unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
