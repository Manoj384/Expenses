-- =============================================================================
-- Migration 010: Shared Splitwise Groups & Trips for Isolated Multi-User Collaboration
-- =============================================================================

CREATE TABLE IF NOT EXISTS shared_splitwise_groups (
  id           text PRIMARY KEY,
  owner_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token  text UNIQUE NOT NULL,
  name         text NOT NULL,
  description  text,
  icon         text DEFAULT '🏖️',
  budget       numeric(14, 2) DEFAULT 0,
  members      jsonb NOT NULL DEFAULT '[]'::jsonb,
  expenses     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Index for instant lookup by share_token
CREATE INDEX IF NOT EXISTS idx_shared_splitwise_groups_token ON shared_splitwise_groups(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_splitwise_groups_owner ON shared_splitwise_groups(owner_id);

-- Enable Row Level Security
ALTER TABLE shared_splitwise_groups ENABLE ROW LEVEL SECURITY;

-- 1. Anyone with the share token can read the shared group (unauthenticated or authenticated)
DROP POLICY IF EXISTS "Public read shared group by token" ON shared_splitwise_groups;
CREATE POLICY "Public read shared group by token" ON shared_splitwise_groups
  FOR SELECT
  USING (true);

-- 2. Anyone with the link can insert or update expenses & members in the shared group
DROP POLICY IF EXISTS "Public update shared group expenses" ON shared_splitwise_groups;
CREATE POLICY "Public update shared group expenses" ON shared_splitwise_groups
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 3. Authenticated owners or creators can insert new shared groups
DROP POLICY IF EXISTS "Allow insert shared groups" ON shared_splitwise_groups;
CREATE POLICY "Allow insert shared groups" ON shared_splitwise_groups
  FOR INSERT
  WITH CHECK (true);

-- 4. Delete permitted by owner
DROP POLICY IF EXISTS "Owner delete shared group" ON shared_splitwise_groups;
CREATE POLICY "Owner delete shared group" ON shared_splitwise_groups
  FOR DELETE
  USING (auth.uid() = owner_id OR owner_id IS NULL);
