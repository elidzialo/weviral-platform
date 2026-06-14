-- ============================================================
-- WeViral Platform — Supabase PostgreSQL Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'influencer', 'marketer');

CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'completed', 'cancelled');

CREATE TYPE application_status AS ENUM (
  'applied',
  'active',
  'proof_submitted',
  'approved',
  'rejected',
  'paid'
);

CREATE TYPE proof_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  role              user_role NOT NULL DEFAULT 'influencer',
  full_name         TEXT NOT NULL DEFAULT '',
  country           TEXT NOT NULL DEFAULT '',
  whatsapp_handle   TEXT,
  stripe_account_id TEXT,
  stripe_onboarded  BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TIERS
-- ============================================================

CREATE TABLE tiers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  views_target      INTEGER NOT NULL,
  influencer_payout NUMERIC(10, 2) NOT NULL,
  platform_fee      NUMERIC(10, 2) NOT NULL,
  total_charge      NUMERIC(10, 2) NOT NULL,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default tiers
INSERT INTO tiers (name, views_target, influencer_payout, platform_fee, total_charge) VALUES
  ('Starter', 100,  10.00,  2.00,  12.00),
  ('Growth',  500,  45.00,  9.00,  54.00),
  ('Viral',   1000, 80.00,  16.00, 96.00),
  ('Elite',   5000, 350.00, 70.00, 420.00);

-- ============================================================
-- CAMPAIGNS
-- ============================================================

CREATE TABLE campaigns (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marketer_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                     TEXT NOT NULL,
  description               TEXT NOT NULL DEFAULT '',
  tier_id                   UUID NOT NULL REFERENCES tiers(id),
  creative_url              TEXT,
  status                    campaign_status NOT NULL DEFAULT 'draft',
  stripe_payment_intent_id  TEXT,
  stripe_checkout_session_id TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- APPLICATIONS
-- ============================================================

CREATE TABLE applications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        application_status NOT NULL DEFAULT 'applied',
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, influencer_id)
);

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PROOF SUBMISSIONS
-- ============================================================

CREATE TABLE proof_submissions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id   UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  screenshot_url   TEXT NOT NULL,
  video_url        TEXT,
  ai_view_count    INTEGER NOT NULL DEFAULT 0,
  ai_confidence    NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ai_is_whatsapp   BOOLEAN NOT NULL DEFAULT FALSE,
  ai_has_creative  BOOLEAN NOT NULL DEFAULT FALSE,
  ai_raw_response  JSONB,
  admin_note       TEXT,
  status           proof_status NOT NULL DEFAULT 'pending',
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYOUTS
-- ============================================================

CREATE TABLE payouts (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id     UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  influencer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_transfer_id TEXT,
  amount             NUMERIC(10, 2) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts          ENABLE ROW LEVEL SECURITY;

-- Helper: get role for the current authenticated user
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────────────────
-- PROFILES policies
-- ────────────────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (get_user_role() = 'admin');

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow insert during sign-up (called by trigger or service role)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- TIERS policies
-- ────────────────────────────────────────────────────────────

-- All authenticated users can read active tiers
CREATE POLICY "tiers_select_authenticated"
  ON tiers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert / update / delete tiers
CREATE POLICY "tiers_all_admin"
  ON tiers FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ────────────────────────────────────────────────────────────
-- CAMPAIGNS policies
-- ────────────────────────────────────────────────────────────

-- All authenticated users can read campaigns
CREATE POLICY "campaigns_select_authenticated"
  ON campaigns FOR SELECT
  USING (auth.role() = 'authenticated');

-- Marketers can insert their own campaigns
CREATE POLICY "campaigns_insert_marketer"
  ON campaigns FOR INSERT
  WITH CHECK (
    auth.uid() = marketer_id
    AND get_user_role() = 'marketer'
  );

-- Marketers can update their own campaigns; admins can update any
CREATE POLICY "campaigns_update_marketer_or_admin"
  ON campaigns FOR UPDATE
  USING (
    auth.uid() = marketer_id
    OR get_user_role() = 'admin'
  )
  WITH CHECK (
    auth.uid() = marketer_id
    OR get_user_role() = 'admin'
  );

-- ────────────────────────────────────────────────────────────
-- APPLICATIONS policies
-- ────────────────────────────────────────────────────────────

-- Influencers can see their own applications
CREATE POLICY "applications_select_influencer"
  ON applications FOR SELECT
  USING (
    auth.uid() = influencer_id
    AND get_user_role() = 'influencer'
  );

-- Marketers can see applications for their campaigns
CREATE POLICY "applications_select_marketer"
  ON applications FOR SELECT
  USING (
    get_user_role() = 'marketer'
    AND EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = applications.campaign_id
        AND campaigns.marketer_id = auth.uid()
    )
  );

-- Admins can see all applications
CREATE POLICY "applications_select_admin"
  ON applications FOR SELECT
  USING (get_user_role() = 'admin');

-- Influencers can create applications
CREATE POLICY "applications_insert_influencer"
  ON applications FOR INSERT
  WITH CHECK (
    auth.uid() = influencer_id
    AND get_user_role() = 'influencer'
  );

-- Admins and the owning marketer can update application status
CREATE POLICY "applications_update_admin_or_marketer"
  ON applications FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR (
      get_user_role() = 'marketer'
      AND EXISTS (
        SELECT 1 FROM campaigns
        WHERE campaigns.id = applications.campaign_id
          AND campaigns.marketer_id = auth.uid()
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- PROOF SUBMISSIONS policies
-- ────────────────────────────────────────────────────────────

-- Admins can see all proof submissions
CREATE POLICY "proof_select_admin"
  ON proof_submissions FOR SELECT
  USING (get_user_role() = 'admin');

-- Influencers can see their own proof submissions
CREATE POLICY "proof_select_influencer"
  ON proof_submissions FOR SELECT
  USING (
    get_user_role() = 'influencer'
    AND EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = proof_submissions.application_id
        AND applications.influencer_id = auth.uid()
    )
  );

-- Influencers can insert proof for their own applications
CREATE POLICY "proof_insert_influencer"
  ON proof_submissions FOR INSERT
  WITH CHECK (
    get_user_role() = 'influencer'
    AND EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = proof_submissions.application_id
        AND applications.influencer_id = auth.uid()
    )
  );

-- Admins can update proof submissions (approve/reject, add notes)
CREATE POLICY "proof_update_admin"
  ON proof_submissions FOR UPDATE
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ────────────────────────────────────────────────────────────
-- PAYOUTS policies
-- ────────────────────────────────────────────────────────────

-- Admins can do everything with payouts
CREATE POLICY "payouts_all_admin"
  ON payouts FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Influencers can see their own payouts
CREATE POLICY "payouts_select_influencer"
  ON payouts FOR SELECT
  USING (
    auth.uid() = influencer_id
    AND get_user_role() = 'influencer'
  );

-- ============================================================
-- TRIGGER: auto-create profile on auth.users insert
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'influencer'
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
