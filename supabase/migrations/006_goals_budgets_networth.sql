-- =============================================
-- MIGRATION 006: Goals, Budgets, and Net Worth Custom Assets
-- =============================================

-- =============================================
-- TABLE: goals
-- =============================================
CREATE TABLE IF NOT EXISTS goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  target_amount   numeric(14, 2) NOT NULL CHECK (target_amount > 0),
  current_amount  numeric(14, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date     date,
  category        text DEFAULT 'Savings',
  linked_sip_id   uuid REFERENCES sips(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- =============================================
-- TABLE: budgets
-- =============================================
CREATE TABLE IF NOT EXISTS budgets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id          uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  monthly_limit        numeric(14, 2) NOT NULL CHECK (monthly_limit > 0),
  alert_threshold_pct  integer DEFAULT 80 CHECK (alert_threshold_pct BETWEEN 10 AND 100),
  created_at           timestamptz DEFAULT now(),
  UNIQUE (user_id, category_id)
);

-- =============================================
-- TABLE: net_worth_custom_assets
-- =============================================
CREATE TABLE IF NOT EXISTS net_worth_custom_assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'liquid' CHECK (type IN ('liquid', 'fixed_deposit', 'epf_ppf', 'real_estate', 'gold', 'crypto', 'other')),
  value       numeric(14, 2) NOT NULL CHECK (value >= 0),
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_assets_user_id ON net_worth_custom_assets(user_id);

-- RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_custom_assets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "goals_all" ON goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "budgets_all" ON budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "net_worth_assets_all" ON net_worth_custom_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
