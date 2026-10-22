-- Migration 009: Allow 'savings' and 'investment' in transactions table check constraint
-- Expands transactions.type check constraint to include 'savings', 'investment', and 'transfer'

DO $$
BEGIN
  -- Drop existing check constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_type_check'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
  END IF;

  -- Add updated check constraint allowing savings, investment, and transfer
  ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
    CHECK (type IN ('expense', 'income', 'debit', 'savings', 'investment', 'transfer'));
END $$;
