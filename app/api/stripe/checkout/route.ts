import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { campaign_id, tier_id } = body as {
      campaign_id: string;
      tier_id: string;
    };

    if (!campaign_id || !tier_id) {
      return NextResponse.json(
        { error: 'campaign_id and tier_id are required' },
        { status: 400 }
      );
    }

    // Fetch tier to get total_charge amount
    const { data: tier, error: tierError } = await supabase
      .from('tiers')
      .select('id, total_charge, name')
      .eq('id', tier_id)
      .single();

    if (tierError || !tier) {
      return NextResponse.json(
        { error: 'Tier not found' },
        { status: 404 }
      );
    }

    // Fetch campaign title
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, marketer_id')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Ensure the authenticated user owns this campaign
    if (campaign.marketer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: you do not own this campaign' },
        { status: 403 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: campaign.title,
            },
            unit_amount: Math.round(tier.total_charge * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/marketer/campaigns?success=1`,
      cancel_url: `${appUrl}/marketer/create`,
      metadata: {
        campaign_id,
        marketer_id: user.id,
        tier_id,
      },
      payment_intent_data: {
        metadata: {
          campaign_id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('[stripe/checkout] Error:', error);
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
