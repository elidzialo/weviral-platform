# WeViral Platform — Deployment Guide

A complete step-by-step guide for getting WeViral running locally and deploying to production at weviral.io.

---

## 1. Install Node.js

1. Go to https://nodejs.org and download the **LTS** version (v20 or later).
2. Run the installer and accept all defaults.
3. Verify the installation:
   ```
   node -v
   npm -v
   ```
   Both commands should print version numbers.

---

## 2. Install Dependencies

In the project root (`weviral-platform/`), run:

```
npm install
```

This installs all packages listed in `package.json` into `node_modules/`.

---

## 3. Configure Environment Variables

1. Copy the example file:
   ```
   cp .env.example .env.local
   ```
   On Windows:
   ```
   copy .env.example .env.local
   ```

2. Open `.env.local` and fill in every value:

   | Variable | Where to get it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase project Settings → API (keep secret) |
   | `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
   | `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks (after registering endpoint) |
   | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
   | `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally, `https://weviral.io` in production |

---

## 4. Create Supabase Project and Run Schema

1. Go to https://supabase.com and sign in (or create a free account).
2. Click **New project**, choose a name (e.g. `weviral`), set a strong database password, and pick the nearest region.
3. Wait for the project to finish provisioning (~1–2 minutes).
4. In the left sidebar go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
5. In the left sidebar go to **SQL Editor** and click **New query**.
6. Open `supabase/schema.sql` from this repo, paste the entire contents into the editor, and click **Run**.
7. Confirm all tables appear under **Table Editor**.

---

## 5. Set Up Stripe

### Get API Keys
1. Go to https://dashboard.stripe.com and sign in (or create an account).
2. In the top-right toggle, make sure you are in **Test mode** for development.
3. Go to **Developers → API keys**.
4. Copy:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

### Set Up Stripe Connect
1. In the Stripe Dashboard go to **Settings → Connect settings**.
2. Enable **Express accounts** (for influencer payouts).
3. Under **Branding**, add your platform name (`WeViral`) and logo.
4. In Connect settings set the **Redirect URI** to:
   - Development: `http://localhost:3000/influencer/earnings`
   - Production: `https://weviral.io/influencer/earnings`

### Register Webhook Endpoint

**For local development** (using Stripe CLI):
1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Copy the webhook signing secret printed in the terminal → `STRIPE_WEBHOOK_SECRET`

**For production:**
1. In the Stripe Dashboard go to **Developers → Webhooks**.
2. Click **Add endpoint**.
3. Set the endpoint URL to: `https://weviral.io/api/stripe/webhook`
4. Select these events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated` (for Connect)
   - `transfer.created`
5. Click **Add endpoint**, then reveal and copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## 6. Deploy to Vercel

1. Push this repository to GitHub (see commands below).
2. Go to https://vercel.com and sign in with your GitHub account.
3. Click **Add New → Project**.
4. Select the `weviral-platform` repository.
5. Vercel will auto-detect Next.js — leave all build settings as defaults.
6. Under **Environment Variables**, add every variable from your `.env.local` file (use the production values, not the local/test ones).
7. Click **Deploy**.
8. Wait for the build to complete (typically 2–3 minutes).
9. Vercel will give you a preview URL like `weviral-platform.vercel.app` — test it before pointing the custom domain.

### Push to GitHub (run these commands first)

```
git remote add origin https://github.com/YOUR_USERNAME/weviral-platform.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## 7. Set Up Custom Domain weviral.io on Vercel

1. In your Vercel project go to **Settings → Domains**.
2. Type `weviral.io` and click **Add**.
3. Vercel will show you DNS records to add. Go to your domain registrar (e.g. Namecheap, GoDaddy, Cloudflare) and add:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |

4. Back in Vercel, click **Verify** — DNS propagation can take up to 48 hours but is usually a few minutes.
5. Vercel automatically provisions an SSL certificate via Let's Encrypt once DNS is verified.
6. Update `NEXT_PUBLIC_APP_URL` in your Vercel environment variables to `https://weviral.io` and redeploy.
7. Update the Stripe webhook endpoint and Stripe Connect redirect URI to use `https://weviral.io` (see Step 5 above).

---

## Quick Reference: Local Development

```
npm run dev
```

Visit http://localhost:3000

---

## Support

For issues, open a GitHub issue on the `weviral-platform` repository.
