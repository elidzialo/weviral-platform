import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: { id: string }
}

// GET /api/campaigns/[id] — fetch single campaign by ID
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        title,
        description,
        status,
        creative_url,
        stripe_payment_intent_id,
        stripe_checkout_session_id,
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
          avatar_url,
          email
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      console.error('campaign GET [id] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(campaign)
  } catch (err) {
    console.error('campaign GET [id] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/campaigns/[id] — update campaign (marketer only, own campaign)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    if (profile.role !== 'marketer' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: marketer or admin role required' }, { status: 403 })
    }

    // Fetch existing campaign to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, marketer_id, status')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Marketers can only edit their own campaigns; admins can edit any
    if (profile.role === 'marketer' && existing.marketer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: you do not own this campaign' }, { status: 403 })
    }

    const body = await request.json()

    // Whitelist updatable fields
    const allowedFields: Array<string> = ['title', 'description', 'tier_id', 'creative_url', 'status']
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    // Marketers cannot change status to arbitrary values
    if (profile.role === 'marketer' && updates.status) {
      const marketerAllowedStatuses = ['draft', 'active', 'cancelled']
      if (!marketerAllowedStatuses.includes(updates.status as string)) {
        return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 })
      }
    }

    const { data: campaign, error: updateError } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', params.id)
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

    if (updateError) {
      console.error('campaign PATCH error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(campaign)
  } catch (err) {
    console.error('campaign PATCH unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id] — cancel campaign (marketer only, own campaign)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
    if (profile.role !== 'marketer' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: marketer or admin role required' }, { status: 403 })
    }

    // Fetch existing campaign to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, marketer_id, status')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (profile.role === 'marketer' && existing.marketer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: you do not own this campaign' }, { status: 403 })
    }

    if (existing.status === 'cancelled') {
      return NextResponse.json({ error: 'Campaign is already cancelled' }, { status: 400 })
    }

    const { data: campaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id, status, updated_at')
      .single()

    if (updateError) {
      console.error('campaign DELETE (cancel) error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(campaign)
  } catch (err) {
    console.error('campaign DELETE unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
