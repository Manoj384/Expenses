-- =============================================
-- Migration 005: Allow Multiple Folios per Scheme in Mutual Funds
-- =============================================

-- Drop old unique constraint on (user_id, scheme_name) if present
ALTER TABLE mutual_funds DROP CONSTRAINT IF EXISTS mutual_funds_user_id_scheme_name_key;

-- Add new constraint allowing multiple folios or unique per (user_id, scheme_name, folio_number)
DO $$ BEGIN
  ALTER TABLE mutual_funds ADD CONSTRAINT mutual_funds_user_id_scheme_folio_key UNIQUE (user_id, scheme_name, folio_number);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;
