-- =============================================
-- Personal Finance Tracker - Complete Initial Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- TABLE: categories
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('expense', 'income', 'debt', 'sip')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name, type)
);

-- =============================================
-- TABLE: payment_methods
-- =============================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('cash', 'online', 'card', 'bank', 'other')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

-- =============================================
-- TABLE: transactions
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              text NOT NULL CHECK (type IN ('expense', 'income', 'debit')),
  amount            numeric(14, 2) NOT NULL CHECK (amount > 0),
  category_id       uuid REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  note              text,
  date              date NOT NULL DEFAULT current_date,
  created_at        timestamptz DEFAULT now()
);

-- Ensure payment_method_id is present even if transactions table pre-existed
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL;

-- =============================================
-- TABLE: sips
-- =============================================
CREATE TABLE IF NOT EXISTS sips (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  amount        numeric(14, 2) NOT NULL CHECK (amount > 0),
  frequency     text NOT NULL DEFAULT 'monthly'
                  CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date    date NOT NULL,
  next_due_date date NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- =============================================
-- TABLE: sip_payments
-- =============================================
CREATE TABLE IF NOT EXISTS sip_payments (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sip_id  uuid NOT NULL REFERENCES sips(id) ON DELETE CASCADE,
  amount  numeric(14, 2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT current_date
);

-- =============================================
-- TABLE: debts
-- =============================================
CREATE TABLE IF NOT EXISTS debts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  principal   numeric(14, 2) NOT NULL CHECK (principal >= 0),
  outstanding numeric(14, 2) NOT NULL CHECK (outstanding >= 0),
  emi         numeric(14, 2) NOT NULL CHECK (emi >= 0),
  due_day     integer CHECK (due_day BETWEEN 1 AND 31),
  created_at  timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id    ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date       ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type       ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category   ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment    ON transactions(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date  ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_categories_user_id      ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_sips_user_id            ON sips(user_id);
CREATE INDEX IF NOT EXISTS idx_sips_active             ON sips(active);
CREATE INDEX IF NOT EXISTS idx_sip_payments_sip_id     ON sip_payments(sip_id);
CREATE INDEX IF NOT EXISTS idx_sip_payments_paid_on    ON sip_payments(paid_on);
CREATE INDEX IF NOT EXISTS idx_debts_user_id           ON debts(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sips            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sip_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts           ENABLE ROW LEVEL SECURITY;

-- ----- categories policies -----
DO $$ BEGIN
  CREATE POLICY "categories_select" ON categories FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "categories_update" ON categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "categories_delete" ON categories FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- payment_methods policies -----
DO $$ BEGIN
  CREATE POLICY "payment_methods_select" ON payment_methods FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "payment_methods_insert" ON payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "payment_methods_update" ON payment_methods FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "payment_methods_delete" ON payment_methods FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- transactions policies -----
DO $$ BEGIN
  CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- sips policies -----
DO $$ BEGIN
  CREATE POLICY "sips_select" ON sips FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sips_insert" ON sips FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sips_update" ON sips FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sips_delete" ON sips FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- sip_payments policies (ownership through sips) -----
DO $$ BEGIN
  CREATE POLICY "sip_payments_select" ON sip_payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM sips WHERE sips.id = sip_payments.sip_id AND sips.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sip_payments_insert" ON sip_payments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sips WHERE sips.id = sip_payments.sip_id AND sips.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sip_payments_update" ON sip_payments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sips WHERE sips.id = sip_payments.sip_id AND sips.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sip_payments_delete" ON sip_payments FOR DELETE USING (
    EXISTS (SELECT 1 FROM sips WHERE sips.id = sip_payments.sip_id AND sips.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- debts policies -----
DO $$ BEGIN
  CREATE POLICY "debts_select" ON debts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "debts_insert" ON debts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "debts_update" ON debts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "debts_delete" ON debts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- RPC: mark_sip_paid (transactional)
-- =============================================
CREATE OR REPLACE FUNCTION mark_sip_paid(p_sip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sip       sips%ROWTYPE;
  v_next_date date;
BEGIN
  -- Fetch and lock the SIP row; verify ownership
  SELECT * INTO v_sip
  FROM sips
  WHERE id = p_sip_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SIP not found or access denied';
  END IF;

  -- Insert payment record
  INSERT INTO sip_payments (sip_id, amount, paid_on)
  VALUES (p_sip_id, v_sip.amount, current_date);

  -- Calculate next due date safely
  CASE v_sip.frequency
    WHEN 'weekly' THEN
      v_next_date := v_sip.next_due_date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      v_next_date := v_sip.next_due_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      v_next_date := v_sip.next_due_date + INTERVAL '3 months';
    WHEN 'yearly' THEN
      v_next_date := v_sip.next_due_date + INTERVAL '1 year';
    ELSE
      v_next_date := v_sip.next_due_date + INTERVAL '1 month';
  END CASE;

  -- Update next due date
  UPDATE sips
  SET next_due_date = v_next_date
  WHERE id = p_sip_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION mark_sip_paid(uuid) TO authenticated;
