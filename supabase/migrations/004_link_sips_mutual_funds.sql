-- =============================================
-- Migration 004: Link SIPs with Mutual Funds
-- =============================================

-- Add fund_id column to sips table if not exists
ALTER TABLE sips 
ADD COLUMN IF NOT EXISTS fund_id uuid REFERENCES mutual_funds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sips_fund_id ON sips(fund_id);
