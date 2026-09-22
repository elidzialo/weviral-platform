-- ============================================================
-- Amazon Ads optimisation agent
-- Run after schema.sql (Supabase SQL editor or `psql -f`).
-- ============================================================

-- One Amazon Ads account link per marketer.
-- Holds the Login-with-Amazon refresh token, so RLS is enabled with NO
-- policies: only the service role (server-side API routes) can read it.
CREATE TABLE amazon_ads_connections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marketer_id   UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  region        TEXT NOT NULL CHECK (region IN ('NA', 'EU', 'FE')),
  refresh_token TEXT NOT NULL,
  profile_id    TEXT,
  profiles      JSONB NOT NULL DEFAULT '[]',
  settings      JSONB NOT NULL DEFAULT '{}',
  auto_apply    BOOLEAN NOT NULL DEFAULT FALSE, -- apply actions without manual approval
  schedule_enabled BOOLEAN NOT NULL DEFAULT TRUE, -- daily run from the cron job
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One optimisation pass: request reports → analyse → propose/apply actions.
CREATE TABLE amazon_ads_runs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marketer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'reports_pending'
               CHECK (status IN ('reports_pending', 'awaiting_approval', 'completed', 'failed')),
  trigger      TEXT NOT NULL DEFAULT 'manual' CHECK (trigger IN ('manual', 'scheduled')),
  date_start   DATE NOT NULL,
  date_end     DATE NOT NULL,
  report_ids   JSONB NOT NULL DEFAULT '{}',
  totals       JSONB,
  summary      TEXT,
  insights     JSONB NOT NULL DEFAULT '[]',
  model        TEXT,
  error        TEXT,
  locked_until TIMESTAMPTZ, -- lease held while a worker analyses the reports
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX amazon_ads_runs_marketer_idx ON amazon_ads_runs (marketer_id, created_at DESC);
CREATE INDEX amazon_ads_runs_pending_idx ON amazon_ads_runs (status) WHERE status = 'reports_pending';

-- Individual changes proposed by the agent and their outcome.
CREATE TABLE amazon_ads_actions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id         UUID NOT NULL REFERENCES amazon_ads_runs(id) ON DELETE CASCADE,
  marketer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type           TEXT NOT NULL
                 CHECK (type IN ('update_bid', 'pause_target', 'add_negative_keyword', 'add_exact_keyword', 'update_budget')),
  entity_kind    TEXT NOT NULL CHECK (entity_kind IN ('keyword', 'target', 'search_term', 'campaign')),
  entity_id      TEXT,
  entity_name    TEXT NOT NULL,
  campaign_id    TEXT NOT NULL,
  campaign_name  TEXT NOT NULL DEFAULT '',
  ad_group_id    TEXT,
  current_value  NUMERIC(12, 2),
  proposed_value NUMERIC(12, 2),
  reason         TEXT NOT NULL DEFAULT '',
  source         TEXT NOT NULL DEFAULT 'rules' CHECK (source IN ('rules', 'agent')),
  metrics        JSONB NOT NULL DEFAULT '{}',
  -- proposed: waiting for the marketer; skipped: dropped by the AI reviewer
  status         TEXT NOT NULL DEFAULT 'proposed'
                 CHECK (status IN ('proposed', 'applied', 'failed', 'rejected', 'skipped')),
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at     TIMESTAMPTZ
);

CREATE INDEX amazon_ads_actions_run_idx ON amazon_ads_actions (run_id);

ALTER TABLE amazon_ads_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_ads_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_ads_actions     ENABLE ROW LEVEL SECURITY;

-- Marketers can read their own runs and actions; all writes go through the service role.
CREATE POLICY "amazon_ads_runs_select_own"
  ON amazon_ads_runs FOR SELECT
  USING (auth.uid() = marketer_id);

CREATE POLICY "amazon_ads_actions_select_own"
  ON amazon_ads_actions FOR SELECT
  USING (auth.uid() = marketer_id);
