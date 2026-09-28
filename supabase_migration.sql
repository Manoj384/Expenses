-- ============================================================
-- Finance Tracker — Complete Supabase Migration
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times (all operations are idempotent)
-- ============================================================


-- ============================================================
-- 1. STATEMENT RECORDS
--    Stores bank statement rows imported via PDF/CSV/SMS parser
-- ============================================================

CREATE TABLE IF NOT EXISTS public.statement_records (
  id             text         PRIMARY KEY,
  user_id        uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           date         NOT NULL,
  description    text,
  category       text,
  amount         numeric(12,2) NOT NULL DEFAULT 0,
  type           text         NOT NULL DEFAULT 'debit',
  payment_method text,
  source_file    text,
  created_at     timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.statement_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own statement records" ON public.statement_records;
CREATE POLICY "Users can manage own statement records"
  ON public.statement_records FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 2. GOALS
--    Financial goals (emergency fund, car, vacation, etc.)
--    Previously localStorage-only — now fully cloud-backed
-- ============================================================

CREATE TABLE IF NOT EXISTS public.goals (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text         NOT NULL,
  target_amount  numeric(14,2) NOT NULL DEFAULT 0,
  current_amount numeric(14,2) NOT NULL DEFAULT 0,
  target_date    date,
  category       text         NOT NULL DEFAULT 'Savings',
  notes          text,
  created_at     timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;
CREATE POLICY "Users can manage own goals"
  ON public.goals FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 3. BUDGETS
--    Monthly budget limits per expense category
-- ============================================================

CREATE TABLE IF NOT EXISTS public.budgets (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id          uuid         NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_limit        numeric(14,2) NOT NULL DEFAULT 0,
  alert_threshold_pct  integer      NOT NULL DEFAULT 80,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
CREATE POLICY "Users can manage own budgets"
  ON public.budgets FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 4. TRANSACTIONS (verify it exists — core table)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              text         NOT NULL DEFAULT 'expense',
  amount            numeric(14,2) NOT NULL DEFAULT 0,
  category_id       uuid         REFERENCES public.categories(id) ON DELETE SET NULL,
  payment_method_id uuid         REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  note              text,
  date              date         NOT NULL DEFAULT CURRENT_DATE,
  receipt_url       text,
  created_at        timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
CREATE POLICY "Users can manage own transactions"
  ON public.transactions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 5. CATEGORIES (verify it exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  type       text        NOT NULL DEFAULT 'expense',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, type)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;
CREATE POLICY "Users can manage own categories"
  ON public.categories FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 6. PAYMENT METHODS (verify it exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  type       text        NOT NULL DEFAULT 'card',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own payment methods" ON public.payment_methods;
CREATE POLICY "Users can manage own payment methods"
  ON public.payment_methods FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 7. DEBTS (verify it exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.debts (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text         NOT NULL,
  type           text         NOT NULL DEFAULT 'loan',
  principal      numeric(14,2) NOT NULL DEFAULT 0,
  outstanding    numeric(14,2) NOT NULL DEFAULT 0,
  interest_rate  numeric(6,3)  NOT NULL DEFAULT 0,
  emi_amount     numeric(14,2),
  start_date     date,
  end_date       date,
  notes          text,
  created_at     timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own debts" ON public.debts;
CREATE POLICY "Users can manage own debts"
  ON public.debts FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 8. MUTUAL FUNDS / SIPs (verify they exist)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mutual_funds (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_name    text         NOT NULL,
  folio_number text,
  units        numeric(18,4) NOT NULL DEFAULT 0,
  nav          numeric(14,4) NOT NULL DEFAULT 0,
  invested     numeric(14,2) NOT NULL DEFAULT 0,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.mutual_funds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own mutual funds" ON public.mutual_funds;
CREATE POLICY "Users can manage own mutual funds"
  ON public.mutual_funds FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.sips (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_name   text         NOT NULL,
  amount      numeric(14,2) NOT NULL DEFAULT 0,
  frequency   text         NOT NULL DEFAULT 'monthly',
  start_date  date,
  next_date   date,
  is_active   boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.sips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sips" ON public.sips;
CREATE POLICY "Users can manage own sips"
  ON public.sips FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 9. SPLITWISE & GROUPS (Phase 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.splitwise_groups (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text         NOT NULL,
  description text,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.splitwise_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own splitwise groups" ON public.splitwise_groups;
CREATE POLICY "Users can manage own splitwise groups"
  ON public.splitwise_groups FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 10. BILL REMINDERS & RECURRING EXPENSES (Phase 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bill_reminders (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 text         NOT NULL,
  amount               numeric(14,2) NOT NULL DEFAULT 0,
  due_day              integer      NOT NULL DEFAULT 5,
  category             text         NOT NULL DEFAULT 'utilities',
  frequency            text         NOT NULL DEFAULT 'monthly',
  auto_log_transaction boolean      NOT NULL DEFAULT true,
  paid_months          text[]       DEFAULT '{}',
  notes                text,
  created_at           timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bill reminders" ON public.bill_reminders;
CREATE POLICY "Users can manage own bill reminders"
  ON public.bill_reminders FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- Done! All Phase 1 & Phase 2 tables and policies are set up.
-- ============================================================

