-- =============================================
-- Migration 003: Mutual Funds & Live NAV Portfolio Hub
-- =============================================

-- 1. Table: mutual_funds
CREATE TABLE IF NOT EXISTS mutual_funds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheme_code     text,
  scheme_name     text NOT NULL,
  fund_house      text,
  category        text DEFAULT 'Equity',
  units           numeric(18, 4) NOT NULL DEFAULT 0,
  avg_nav         numeric(14, 4) NOT NULL DEFAULT 0,
  invested_amount numeric(14, 2) NOT NULL DEFAULT 0,
  current_nav     numeric(14, 4) DEFAULT 0,
  current_value   numeric(14, 2) DEFAULT 0,
  folio_number    text,
  last_updated    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, scheme_name)
);

-- 2. Table: mutual_fund_transactions
CREATE TABLE IF NOT EXISTS mutual_fund_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id    uuid NOT NULL REFERENCES mutual_funds(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('buy', 'sip', 'sell', 'dividend')),
  amount     numeric(14, 2) NOT NULL,
  nav        numeric(14, 4) NOT NULL,
  units      numeric(18, 4) NOT NULL,
  date       date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_mutual_funds_user_id ON mutual_funds(user_id);
CREATE INDEX IF NOT EXISTS idx_mf_tx_fund_id ON mutual_fund_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_mf_tx_user_id ON mutual_fund_transactions(user_id);

-- 4. Enable Row Level Security
ALTER TABLE mutual_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutual_fund_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for mutual_funds
DO $$ BEGIN
  CREATE POLICY "mutual_funds_select" ON mutual_funds FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mutual_funds_insert" ON mutual_funds FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mutual_funds_update" ON mutual_funds FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mutual_funds_delete" ON mutual_funds FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. RLS Policies for mutual_fund_transactions
DO $$ BEGIN
  CREATE POLICY "mf_tx_select" ON mutual_fund_transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mf_tx_insert" ON mutual_fund_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mf_tx_update" ON mutual_fund_transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "mf_tx_delete" ON mutual_fund_transactions FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
