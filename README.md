# WeViral Platform

WeViral is a WhatsApp Status influencer marketing platform. Marketers create campaigns, influencers post ads to their WhatsApp Status, submit screenshot proof of posting, and get paid via Stripe escrow. An admin reviews and approves proof before payment is released.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| File Storage | Supabase Storage |
| Payments | Stripe (Connect + Escrow via Payment Intents) |
| AI Moderation | OpenAI GPT-4o Vision |
| Deployment | Vercel |

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/weviral-platform.git
cd weviral-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all required values (see sections below for where to get each key).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Supabase Setup

1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. Once the project is provisioned, go to **Project Settings > API**.
3. Copy the following values into your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — the Project URL (e.g. `https://abcdefgh.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` / `public` key
   - `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` key (keep this secret — never expose it client-side)
4. In the Supabase dashboard, go to the **SQL Editor** and run the migration files found in `supabase/migrations/` in order to create all required tables, RLS policies, and indexes.
5. Go to **Storage** and create a bucket named `proof-screenshots`. Set it to private (access only via signed URLs).
6. Go to **Authentication > Providers** and enable Email/Password sign-in. Optionally configure a custom SMTP provider under **Auth > SMTP Settings** for production email delivery.

---

## Stripe Setup

WeViral uses Stripe Connect to hold funds in escrow and release them to influencers after admin approval.

### Test mode (development)

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) and create or log in to your account.
2. Make sure you are in **Test mode** (toggle in the top-right).
3. Go to **Developers > API keys** and copy:
   - `STRIPE_SECRET_KEY` — the Secret key (starts with `sk_test_`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — the Publishable key (starts with `pk_test_`)
4. Set up a webhook to receive events from Stripe:
   - Install the Stripe CLI: `npm install -g stripe` or download from [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
   - Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` during local development
   - Copy the webhook signing secret printed by the CLI into `STRIPE_WEBHOOK_SECRET`
5. Enable **Stripe Connect** in your dashboard under **Connect > Settings** to allow payouts to influencer accounts.

### Production

1. Switch to **Live mode** in the Stripe dashboard.
2. Replace all test keys with live keys in your production environment variables.
3. Create a production webhook endpoint pointing to `https://weviral.co.uk/api/webhooks/stripe` and subscribe to at minimum:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `transfer.created`
   - `account.updated`

---

## OpenAI Setup

WeViral uses GPT-4o Vision to assist admins by automatically checking screenshot proof for authenticity.

1. Go to [https://platform.openai.com](https://platform.openai.com) and log in or create an account.
2. Go to **API Keys** and create a new secret key.
3. Copy it into `OPENAI_API_KEY` in your `.env.local`.
4. Ensure your account has access to the `gpt-4o` model (may require billing setup).

---

## Vercel Deployment

### First deploy

1. Push your repository to GitHub (or GitLab / Bitbucket).
2. Go to [https://vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your repository.
4. Vercel will auto-detect Next.js. Leave the build settings as defaults.
5. Under **Environment Variables**, add every key from `.env.example` with your production values.
6. Click **Deploy**.

### Subsequent deploys

Every push to the `main` branch triggers an automatic production deployment. Pull requests get preview deployments automatically.

### Domain setup

1. In the Vercel project dashboard, go to **Settings > Domains**.
2. Add `weviral.co.uk` and follow the DNS instructions to point your domain to Vercel.
3. Vercel provisions a free TLS certificate automatically.
4. Update `NEXT_PUBLIC_APP_URL` in your Vercel environment variables to `https://weviral.co.uk`.
5. Add `weviral.co.uk` to the Stripe webhook allowed origins and update your production webhook URL accordingly.

---

## Project Structure

```
weviral-platform/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/             # Auth routes (login, signup, reset)
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── marketer/       # Marketer-facing pages (campaigns, analytics)
│   │   ├── influencer/     # Influencer-facing pages (jobs, submissions)
│   │   └── admin/          # Admin pages (proof review, payouts)
│   └── api/                # API route handlers
│       └── webhooks/
│           └── stripe/     # Stripe webhook handler
├── components/             # Shared UI components
├── lib/                    # Utility libraries (supabase client, stripe, openai)
├── supabase/
│   └── migrations/         # SQL migration files
├── .env.example            # Environment variable template
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## License

Private and proprietary. All rights reserved.
