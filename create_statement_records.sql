-- Run this in Supabase Dashboard > SQL Editor
CREATE TABLE IF NOT EXISTS public.statement_records (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text,
  category text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'debit',
  payment_method text,
  source_file text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.statement_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'statement_records'
    AND policyname = 'Users can manage own statement records'
  ) THEN
    CREATE POLICY "Users can manage own statement records"
      ON public.statement_records
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
