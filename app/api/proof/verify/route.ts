import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyProofScreenshot } from '@/lib/openai'

// POST /api/proof/verify — submit proof for AI verification and admin review
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
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.role !== 'influencer') {
      return NextResponse.json({ error: 'Forbidden: influencer role required' }, { status: 403 })
    }

    const body = await request.json()
    const { application_id, screenshot_url, video_url } = body

    if (!application_id || typeof application_id !== 'string') {
      return NextResponse.json({ error: 'application_id is required' }, { status: 400 })
    }
    if (!screenshot_url || typeof screenshot_url !== 'string') {
      return NextResponse.json({ error: 'screenshot_url is required' }, { status: 400 })
    }

    // Validate screenshot_url is a proper URL
    try {
      new URL(screenshot_url)
    } catch {
      return NextResponse.json({ error: 'screenshot_url must be a valid URL' }, { status: 400 })
    }

    if (video_url) {
      try {
        new URL(video_url)
      } catch {
        return NextResponse.json({ error: 'video_url must be a valid URL' }, { status: 400 })
      }
    }

    // Verify the influencer owns the application and fetch campaign+tier details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        influencer_id,
        campaign_id,
        campaigns (
          id,
          title,
          tiers (
            id,
            name,
            views_target,
            influencer_payout
          )
        )
      `)
      .eq('id', application_id)
      .eq('influencer_id', user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found or you do not have access to it' },
        { status: 404 }
      )
    }

    // Only allow proof submission for active applications
    const allowedStatuses = ['active', 'rejected']
    if (!allowedStatuses.includes(application.status)) {
      return NextResponse.json(
        { error: `Cannot submit proof for application with status "${application.status}". Application must be active.` },
        { status: 400 }
      )
    }

    // Extract views_target from nested tier
    const campaign = application.campaigns as {
      id: string
      title: string
      tiers: { id: string; name: string; views_target: number; influencer_payout: number } | null
    } | null

    if (!campaign?.tiers) {
      return NextResponse.json({ error: 'Campaign tier information not found' }, { status: 500 })
    }

    const viewsTarget = campaign.tiers.views_target

    // Call OpenAI for AI verification
    let aiResult: {
      views: number
      is_whatsapp_status: boolean
      has_creative: boolean
      confidence: number
      target_met: boolean
      notes: string
    }

    try {
      aiResult = await verifyProofScreenshot(screenshot_url, viewsTarget)
    } catch (openaiErr) {
      console.error('OpenAI verification error:', openaiErr)
      return NextResponse.json({ error: 'AI verification failed. Please try again.' }, { status: 502 })
    }

    // Insert proof_submission row
    const { data: submission, error: insertError } = await supabase
      .from('proof_submissions')
      .insert({
        application_id,
        screenshot_url,
        video_url: video_url ?? null,
        ai_view_count: aiResult.views ?? 0,
        ai_confidence: aiResult.confidence ?? 0,
        ai_is_whatsapp: aiResult.is_whatsapp_status ?? false,
        ai_has_creative: aiResult.has_creative ?? false,
        ai_raw_response: aiResult,
        status: 'pending',
      })
      .select('id, status, submitted_at, ai_view_count, ai_confidence, ai_is_whatsapp, ai_has_creative')
      .single()

    if (insertError) {
      console.error('proof_submissions insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update application status to proof_submitted
    const { error: appUpdateError } = await supabase
      .from('applications')
      .update({ status: 'proof_submitted', updated_at: new Date().toISOString() })
      .eq('id', application_id)

    if (appUpdateError) {
      console.error('application status update error after proof insert:', appUpdateError)
      // Non-fatal: proof was saved, just log
    }

    return NextResponse.json({
      submission_id: submission.id,
      ai_result: aiResult,
      status: submission.status,
      submitted_at: submission.submitted_at,
    }, { status: 201 })
  } catch (err) {
    console.error('proof verify unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
