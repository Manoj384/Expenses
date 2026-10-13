-- ============================================================
-- MIGRATION 008: RELAX GOALS TARGET_DATE NOT-NULL CONSTRAINT
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Drop the NOT NULL constraint on target_date if it was enforced
ALTER TABLE IF EXISTS public.goals 
  ALTER COLUMN target_date DROP NOT NULL;

-- 2. Provide a default fallback of 1 year from the creation date
ALTER TABLE IF EXISTS public.goals 
  ALTER COLUMN target_date SET DEFAULT (CURRENT_DATE + INTERVAL '1 year');
