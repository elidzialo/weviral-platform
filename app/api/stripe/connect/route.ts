import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

function createSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
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
}

// POST — Create or re-onboard a Stripe Connect Express account for an influencer
export async function POST(_req: NextRequest) {
  try {
    const supabase = createSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch influencer profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, email, stripe_account_id, stripe_onboarded')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'influencer') {
      return NextResponse.json(
        { error: 'Forbidden: only influencers can connect a Stripe account' },
        { status: 403 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    let stripeAccountId: string;

    if (profile.stripe_account_id) {
      // Account already exists — create a new AccountLink for re-onboarding
      stripeAccountId = profile.stripe_account_id;
    } else {
      // Create a new Stripe Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile.email ?? user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
      });

      stripeAccountId = account.id;

      // Persist the new account ID on the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id);

      if (updateError) {
        console.error('[stripe/connect] Failed to update profile:', updateError);
        return NextResponse.json(
          { error: 'Failed to save Stripe account' },
          { status: 500 }
        );
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/influencer/earnings`,
      return_url: `${appUrl}/influencer/earnings?stripe=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: unknown) {
    console.error('[stripe/connect POST] Error:', error);
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

// GET — Check whether the influencer has completed Stripe onboarding
export async function GET(_req: NextRequest) {
  try {
    const supabase = createSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, stripe_account_id, stripe_onboarded')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'influencer') {
      return NextResponse.json(
        { error: 'Forbidden: only influencers can check onboarding status' },
        { status: 403 }
      );
    }

    if (!profile.stripe_account_id) {
      return NextResponse.json({ onboarded: false });
    }

    // Retrieve the Stripe account to check live status
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const onboarded = account.details_submitted === true;

    // Sync onboarded status back to the profile if it has changed
    if (onboarded && !profile.stripe_onboarded) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_onboarded: true })
        .eq('id', user.id);

      if (updateError) {
        console.error(
          '[stripe/connect GET] Failed to update stripe_onboarded:',
          updateError
        );
      }
    }

    return NextResponse.json({ onboarded });
  } catch (error: unknown) {
    console.error('[stripe/connect GET] Error:', error);
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
