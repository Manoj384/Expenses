-- =============================================
-- MIGRATION 007: Friends & Family Borrowing, Money Lent & Debt Settlement
-- =============================================

ALTER TABLE debts ADD COLUMN IF NOT EXISTS debt_type text DEFAULT 'personal';
ALTER TABLE debts ADD COLUMN IF NOT EXISTS person_name text;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS target_date date;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE debts ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS cleared_at timestamptz;

-- Index
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_type ON debts(debt_type);
