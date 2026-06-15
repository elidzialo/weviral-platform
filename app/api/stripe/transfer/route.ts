import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    // Verify the caller is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the caller is an admin
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (adminProfileError || !adminProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (adminProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { application_id, proof_submission_id } = body as {
      application_id: string;
      proof_submission_id: string;
    };

    if (!application_id || !proof_submission_id) {
      return NextResponse.json(
        { error: 'application_id and proof_submission_id are required' },
        { status: 400 }
      );
    }

    // Fetch application with campaign and tier info
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .select(
        `
        id,
        status,
        influencer_id,
        campaign_id,
        tier_id,
        campaigns (
          id,
          title
        ),
        tiers (
          id,
          name,
          influencer_payout
        )
      `
      )
      .eq('id', application_id)
      .single();

    if (applicationError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Prevent double-payment
    if (application.status === 'paid') {
      return NextResponse.json(
        { error: 'Application has already been paid' },
        { status: 409 }
      );
    }

    const tier = Array.isArray(application.tiers)
      ? application.tiers[0]
      : application.tiers;

    if (!tier || tier.influencer_payout == null) {
      return NextResponse.json(
        { error: 'Tier payout information is missing' },
        { status: 422 }
      );
    }

    // Fetch influencer profile
    const { data: influencer, error: influencerError } = await supabase
      .from('profiles')
      .select('id, stripe_account_id, stripe_onboarded')
      .eq('id', application.influencer_id)
      .single();

    if (influencerError || !influencer) {
      return NextResponse.json(
        { error: 'Influencer profile not found' },
        { status: 404 }
      );
    }

    if (!influencer.stripe_onboarded || !influencer.stripe_account_id) {
      return NextResponse.json(
        {
          error:
            'Influencer has not completed Stripe onboarding — cannot transfer funds',
        },
        { status: 422 }
      );
    }

    // Create the Stripe Transfer to the influencer's Connect account
    const transfer = await stripe.transfers.create({
      amount: Math.round(tier.influencer_payout * 100), // convert to pence
      currency: 'gbp',
      destination: influencer.stripe_account_id,
      transfer_group: application_id,
      metadata: {
        application_id,
        campaign_id: application.campaign_id,
        influencer_id: application.influencer_id,
      },
    });

    // Update application status to 'paid'
    const { error: appUpdateError } = await supabase
      .from('applications')
      .update({ status: 'paid' })
      .eq('id', application_id);

    if (appUpdateError) {
      console.error(
        '[stripe/transfer] Failed to update application status:',
        appUpdateError
      );
    }

    // Update proof_submission status to 'approved'
    const { error: proofUpdateError } = await supabase
      .from('proof_submissions')
      .update({ status: 'approved' })
      .eq('id', proof_submission_id);

    if (proofUpdateError) {
      console.error(
        '[stripe/transfer] Failed to update proof_submission status:',
        proofUpdateError
      );
    }

    // Insert payout record
    const { error: payoutInsertError } = await supabase
      .from('payouts')
      .insert({
        application_id,
        influencer_id: application.influencer_id,
        campaign_id: application.campaign_id,
        tier_id: application.tier_id,
        amount: tier.influencer_payout,
        currency: 'gbp',
        stripe_transfer_id: transfer.id,
        proof_submission_id,
        status: 'completed',
      });

    if (payoutInsertError) {
      console.error(
        '[stripe/transfer] Failed to insert payout record:',
        payoutInsertError
      );
    }

    return NextResponse.json({
      success: true,
      transfer_id: transfer.id,
    });
  } catch (error: unknown) {
    console.error('[stripe/transfer] Error:', error);
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 500 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
