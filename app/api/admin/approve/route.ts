import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

// POST /api/admin/approve — admin approves a proof submission and triggers payout
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
    const { proof_submission_id } = body

    if (!proof_submission_id || typeof proof_submission_id !== 'string') {
      return NextResponse.json({ error: 'proof_submission_id is required' }, { status: 400 })
    }

    // Use admin client for privileged operations (bypasses RLS)
    const adminClient = createAdminClient()

    // Fetch proof submission with application → campaign → tier
    const { data: submission, error: submissionError } = await adminClient
      .from('proof_submissions')
      .select(`
        id,
        status,
        application_id,
        screenshot_url,
        applications (
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
              influencer_payout,
              platform_fee
            )
          )
        )
      `)
      .eq('id', proof_submission_id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Proof submission not found' }, { status: 404 })
    }

    if (submission.status === 'approved') {
      return NextResponse.json({ error: 'Proof submission is already approved' }, { status: 400 })
    }
    if (submission.status === 'rejected') {
      return NextResponse.json({ error: 'Cannot approve a rejected submission' }, { status: 400 })
    }

    const application = submission.applications as {
      id: string
      status: string
      influencer_id: string
      campaign_id: string
      campaigns: {
        id: string
        title: string
        tiers: {
          id: string
          name: string
          influencer_payout: number
          platform_fee: number
        } | null
      } | null
    } | null

    if (!application) {
      return NextResponse.json({ error: 'Associated application not found' }, { status: 404 })
    }

    const campaign = application.campaigns
    if (!campaign?.tiers) {
      return NextResponse.json({ error: 'Campaign tier information not found' }, { status: 500 })
    }

    const tier = campaign.tiers

    // Fetch influencer profile for Stripe account details
    const { data: influencerProfile, error: influencerError } = await adminClient
      .from('profiles')
      .select('id, full_name, email, stripe_account_id, stripe_onboarded')
      .eq('id', application.influencer_id)
      .single()

    if (influencerError || !influencerProfile) {
      return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 })
    }

    if (!influencerProfile.stripe_account_id || !influencerProfile.stripe_onboarded) {
      return NextResponse.json(
        { error: 'Influencer has not completed Stripe onboarding and cannot receive payouts' },
        { status: 400 }
      )
    }

    // Convert payout to cents for Stripe (influencer_payout is stored as decimal £/$)
    const payoutAmountCents = Math.round(Number(tier.influencer_payout) * 100)

    if (payoutAmountCents <= 0) {
      return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 })
    }

    // Create Stripe transfer to the influencer's connected account
    let stripeTransfer: { id: string }
    try {
      stripeTransfer = await stripe.transfers.create({
        amount: payoutAmountCents,
        currency: 'gbp',
        destination: influencerProfile.stripe_account_id,
        metadata: {
          proof_submission_id: submission.id,
          application_id: application.id,
          campaign_id: application.campaign_id,
          influencer_id: influencerProfile.id,
          tier_name: tier.name,
        },
        description: `WeViral payout — ${campaign.title} (${tier.name} tier)`,
      })
    } catch (stripeErr: unknown) {
      const errMessage = stripeErr instanceof Error ? stripeErr.message : 'Stripe transfer failed'
      console.error('Stripe transfer error:', stripeErr)
      return NextResponse.json({ error: `Stripe transfer failed: ${errMessage}` }, { status: 502 })
    }

    // Update proof_submission status to approved
    const { error: submissionUpdateError } = await adminClient
      .from('proof_submissions')
      .update({ status: 'approved' })
      .eq('id', proof_submission_id)

    if (submissionUpdateError) {
      console.error('proof_submission approve update error:', submissionUpdateError)
      return NextResponse.json(
        { error: 'Stripe transfer succeeded but failed to update submission status. Contact support.' },
        { status: 500 }
      )
    }

    // Update application status to paid
    const { error: appUpdateError } = await adminClient
      .from('applications')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', application.id)

    if (appUpdateError) {
      console.error('application paid update error:', appUpdateError)
      // Non-fatal: transfer and submission are updated, log for manual reconciliation
    }

    // Insert payout record
    const { data: payout, error: payoutInsertError } = await adminClient
      .from('payouts')
      .insert({
        application_id: application.id,
        influencer_id: influencerProfile.id,
        stripe_transfer_id: stripeTransfer.id,
        amount: tier.influencer_payout,
      })
      .select('id, amount, created_at')
      .single()

    if (payoutInsertError) {
      console.error('payout insert error:', payoutInsertError)
      // Non-fatal: transfer completed, log for reconciliation
    }

    return NextResponse.json({
      success: true,
      proof_submission_id: submission.id,
      application_id: application.id,
      stripe_transfer_id: stripeTransfer.id,
      payout_id: payout?.id ?? null,
      amount: tier.influencer_payout,
      influencer_id: influencerProfile.id,
    })
  } catch (err) {
    console.error('admin approve unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
