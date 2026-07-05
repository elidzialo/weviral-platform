-- ============================================================
-- Construction Finance Module
-- Run this in the Supabase SQL editor after schema.sql
-- ============================================================

CREATE TABLE cf_projects (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  client_name    TEXT NOT NULL,
  client_contact TEXT,
  contract_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  start_date     DATE,
  end_date       DATE,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','completed','on_hold','cancelled')),
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices sent to clients
CREATE TABLE cf_invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES cf_projects(id) ON DELETE CASCADE,
  invoice_number TEXT,
  type           TEXT NOT NULL DEFAULT 'monthly'
                   CHECK (type IN ('deposit','monthly','milestone','final','variation')),
  description    TEXT NOT NULL DEFAULT '',
  amount         NUMERIC(12, 2) NOT NULL,
  vat_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  issue_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  paid_date      DATE,
  status         TEXT NOT NULL DEFAULT 'sent'
                   CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  notes          TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments made to subcontractors
CREATE TABLE cf_subcontractor_payments (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id         UUID NOT NULL REFERENCES cf_projects(id) ON DELETE CASCADE,
  subcontractor_name TEXT NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  amount             NUMERIC(12, 2) NOT NULL,
  payment_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  status             TEXT NOT NULL DEFAULT 'paid'
                       CHECK (status IN ('pending','paid')),
  notes              TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at (reuses the function from schema.sql)
CREATE TRIGGER cf_projects_updated_at
  BEFORE UPDATE ON cf_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER cf_invoices_updated_at
  BEFORE UPDATE ON cf_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER cf_subcontractor_payments_updated_at
  BEFORE UPDATE ON cf_subcontractor_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: any authenticated user can read/write (covers both Eli and Akiva)
ALTER TABLE cf_projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_subcontractor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_projects_auth"
  ON cf_projects FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "cf_invoices_auth"
  ON cf_invoices FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "cf_sub_payments_auth"
  ON cf_subcontractor_payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
