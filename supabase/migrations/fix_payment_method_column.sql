-- ==========================================================
-- Safe Migration: Add Payment Methods and Missing Columns
-- ==========================================================

-- 1. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create payment_methods table if not exists
CREATE TABLE IF NOT EXISTS payment_methods (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('cash', 'online', 'card', 'bank', 'other')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

-- 3. Explicitly add payment_method_id column to transactions if missing
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL;

-- 4. Create indexes safely
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment ON transactions(payment_method_id);

-- 5. Enable RLS on payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- 6. Add RLS policies for payment_methods safely
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
