import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/approvals-list — fetch all pending proof submissions for the admin approvals page
export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('proof_submissions')
      .select(`
        id,
        submitted_at,
        screenshot_url,
        video_url,
        ai_view_count,
        ai_confidence,
        ai_is_whatsapp,
        ai_has_creative,
        ai_raw_response,
        status,
        admin_note,
        application_id,
        applications (
          id,
          influencer_id,
          campaigns (
            id,
            title,
            marketer:profiles!campaigns_marketer_id_fkey (
              full_name,
              email
            ),
            tiers (
              id,
              name,
              views_target
            )
          ),
          influencer:profiles!applications_influencer_id_fkey (
            id,
            full_name,
            whatsapp_handle
          )
        )
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })

    if (error) {
      console.error('approvals-list error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten the nested joins into a flat structure for the client
    const submissions = (data ?? []).map((row: any) => {
      const app = row.applications
      const campaign = app?.campaigns
      const tier = campaign?.tiers
      const marketer = campaign?.marketer
      const influencer = app?.influencer

      return {
        id: row.id,
        submitted_at: row.submitted_at,
        screenshot_url: row.screenshot_url,
        video_url: row.video_url,
        ai_view_count: row.ai_view_count ?? 0,
        ai_confidence: Number(row.ai_confidence ?? 0),
        ai_is_whatsapp: row.ai_is_whatsapp ?? false,
        ai_has_creative: row.ai_has_creative ?? false,
        ai_raw_response: row.ai_raw_response,
        status: row.status,
        admin_note: row.admin_note,
        application_id: row.application_id,
        campaign_title: campaign?.title ?? 'Unknown Campaign',
        campaign_marketer: marketer?.full_name || marketer?.email || 'Unknown',
        tier_name: tier?.name ?? 'Unknown',
        tier_views_target: tier?.views_target ?? 0,
        influencer_name: influencer?.full_name ?? 'Unknown',
        influencer_handle: influencer?.whatsapp_handle ?? null,
      }
    })

    return NextResponse.json({ submissions })
  } catch (err) {
    console.error('approvals-list unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
