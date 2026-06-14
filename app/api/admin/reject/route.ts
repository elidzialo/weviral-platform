import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/reject — admin rejects a proof submission
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { proof_submission_id, note } = body

    if (!proof_submission_id || typeof proof_submission_id !== 'string') {
      return NextResponse.json({ error: 'proof_submission_id is required' }, { status: 400 })
    }

    const adminNote = typeof note === 'string' ? note.trim() : ''

    // Use admin client for privileged operations (bypasses RLS)
    const adminClient = createAdminClient()

    // Fetch proof submission with application details
    const { data: submission, error: submissionError } = await adminClient
      .from('proof_submissions')
      .select(`
        id,
        status,
        application_id,
        applications (
          id,
          status,
          influencer_id
        )
      `)
      .eq('id', proof_submission_id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Proof submission not found' }, { status: 404 })
    }

    if (submission.status === 'rejected') {
      return NextResponse.json({ error: 'Proof submission is already rejected' }, { status: 400 })
    }
    if (submission.status === 'approved') {
      return NextResponse.json({ error: 'Cannot reject an already approved submission' }, { status: 400 })
    }

    const application = submission.applications as {
      id: string
      status: string
      influencer_id: string
    } | null

    if (!application) {
      return NextResponse.json({ error: 'Associated application not found' }, { status: 404 })
    }

    // Update proof_submission status to rejected with admin note
    const { error: submissionUpdateError } = await adminClient
      .from('proof_submissions')
      .update({
        status: 'rejected',
        admin_note: adminNote || null,
      })
      .eq('id', proof_submission_id)

    if (submissionUpdateError) {
      console.error('proof_submission reject update error:', submissionUpdateError)
      return NextResponse.json({ error: submissionUpdateError.message }, { status: 500 })
    }

    // Update application status to rejected (influencer can resubmit by creating a new application)
    const { error: appUpdateError } = await adminClient
      .from('applications')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', application.id)

    if (appUpdateError) {
      console.error('application reject update error:', appUpdateError)
      return NextResponse.json(
        { error: 'Submission was rejected but failed to update application status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      proof_submission_id: submission.id,
      application_id: application.id,
      note: adminNote || null,
    })
  } catch (err) {
    console.error('admin reject unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
