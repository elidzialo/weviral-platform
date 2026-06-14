import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/campaigns — fetch all active campaigns (for influencer browse page)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'active'

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        title,
        description,
        status,
        creative_url,
        created_at,
        updated_at,
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
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('campaigns GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(campaigns)
  } catch (err) {
    console.error('campaigns GET unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/campaigns — create a new campaign (marketer only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify marketer role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.role !== 'marketer') {
      return NextResponse.json({ error: 'Forbidden: marketer role required' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, tier_id } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!tier_id || typeof tier_id !== 'string') {
      return NextResponse.json({ error: 'tier_id is required' }, { status: 400 })
    }

    // Verify tier exists
    const { data: tier, error: tierError } = await supabase
      .from('tiers')
      .select('id')
      .eq('id', tier_id)
      .eq('active', true)
      .single()

    if (tierError || !tier) {
      return NextResponse.json({ error: 'Invalid or inactive tier' }, { status: 400 })
    }

    const { data: campaign, error: insertError } = await supabase
      .from('campaigns')
      .insert({
        marketer_id: user.id,
        title: title.trim(),
        description: description?.trim() ?? '',
        tier_id,
        status: 'draft',
      })
      .select(`
        id,
        title,
        description,
        status,
        creative_url,
        created_at,
        updated_at,
        tiers (
          id,
          name,
          views_target,
          influencer_payout,
          platform_fee,
          total_charge
        )
      `)
      .single()

    if (insertError) {
      console.error('campaigns POST insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(campaign, { status: 201 })
  } catch (err) {
    console.error('campaigns POST unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
