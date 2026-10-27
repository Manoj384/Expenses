-- =============================================================================
-- Migration 010: Shared Splitwise Groups & Trips for Isolated Multi-User Collaboration
-- =============================================================================

CREATE TABLE IF NOT EXISTS shared_splitwise_groups (
  id           text PRIMARY KEY,
  owner_id     uuid DEFAULT NULL,
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

-- Explicitly grant permissions to anon and authenticated API roles
GRANT ALL ON TABLE shared_splitwise_groups TO anon, authenticated, service_role;

-- Enable Row Level Security
ALTER TABLE shared_splitwise_groups ENABLE ROW LEVEL SECURITY;

-- 1. Direct table access is restricted to authenticated owners.
-- Public link visitors access individual trips by token via the 'shared-trip' Edge Function.
DROP POLICY IF EXISTS "Public read shared group by token" ON shared_splitwise_groups;
CREATE POLICY "Owner read shared group" ON shared_splitwise_groups
  FOR SELECT
  USING (auth.uid() = owner_id);

-- 2. Authenticated owners can update their groups
DROP POLICY IF EXISTS "Public update shared group expenses" ON shared_splitwise_groups;
CREATE POLICY "Owner update shared group" ON shared_splitwise_groups
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 3. Authenticated owners can create new shared groups
DROP POLICY IF EXISTS "Allow insert shared groups" ON shared_splitwise_groups;
CREATE POLICY "Owner insert shared group" ON shared_splitwise_groups
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 4. Delete permitted by owner
DROP POLICY IF EXISTS "Owner delete shared group" ON shared_splitwise_groups;
CREATE POLICY "Owner delete shared group" ON shared_splitwise_groups
  FOR DELETE
  USING (auth.uid() = owner_id);
