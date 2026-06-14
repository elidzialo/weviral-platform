import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Use the service-role key for webhook handlers so RLS is bypassed
function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] Signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const campaignId = session.metadata?.campaign_id;

        if (!campaignId) {
          console.warn(
            '[stripe/webhook] checkout.session.completed — no campaign_id in metadata',
            session.id
          );
          break;
        }

        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            status: 'active',
            stripe_checkout_session_id: session.id,
          })
          .eq('id', campaignId);

        if (updateError) {
          console.error(
            '[stripe/webhook] Failed to update campaign after checkout:',
            updateError
          );
          // Return 500 so Stripe retries the webhook
          return NextResponse.json(
            { error: 'Failed to update campaign' },
            { status: 500 }
          );
        }

        console.info(
          `[stripe/webhook] Campaign ${campaignId} set to active — session ${session.id}`
        );
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.info(
          `[stripe/webhook] payment_intent.succeeded — id: ${paymentIntent.id}, amount: ${paymentIntent.amount} ${paymentIntent.currency}`
        );
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        console.info(
          `[stripe/webhook] transfer.created — id: ${transfer.id}, amount: ${transfer.amount} ${transfer.currency}, destination: ${transfer.destination}`
        );
        break;
      }

      default: {
        console.info(`[stripe/webhook] Unhandled event type: ${event.type}`);
        break;
      }
    }
  } catch (error: unknown) {
    console.error('[stripe/webhook] Handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error during event handling' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
