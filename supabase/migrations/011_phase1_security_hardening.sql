-- =============================================================================
-- Migration 011: Phase 1 Security Hardening
-- Apply after migrations 001-010. This migration replaces insecure public RLS
-- policies; it is intentionally forward-only for already deployed projects.
-- =============================================================================

-- Shared Splitwise groups: clients can only access groups they own directly.
-- Share-link access is handled exclusively by the shared-trip Edge Function,
-- which performs an exact, high-entropy token lookup with the service-role key.
REVOKE ALL ON TABLE public.shared_splitwise_groups FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_splitwise_groups TO authenticated;

DROP POLICY IF EXISTS "Public read shared group by token" ON public.shared_splitwise_groups;
DROP POLICY IF EXISTS "Public update shared group expenses" ON public.shared_splitwise_groups;
DROP POLICY IF EXISTS "Allow insert shared groups" ON public.shared_splitwise_groups;
DROP POLICY IF EXISTS "Owner delete shared group" ON public.shared_splitwise_groups;
DROP POLICY IF EXISTS "shared_groups_owner_select" ON public.shared_splitwise_groups;
DROP POLICY IF EXISTS "shared_groups_owner_insert" ON public.shared_splitwise_groups;
DROP POLICY IF EXISTS "shared_groups_owner_update" ON public.shared_splitwise_groups;
DROP POLICY IF EXISTS "shared_groups_owner_delete" ON public.shared_splitwise_groups;

CREATE POLICY "shared_groups_owner_select"
  ON public.shared_splitwise_groups FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "shared_groups_owner_insert"
  ON public.shared_splitwise_groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "shared_groups_owner_update"
  ON public.shared_splitwise_groups FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "shared_groups_owner_delete"
  ON public.shared_splitwise_groups FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- EMC reference material remains public read-only. Personal documents and lab
-- runs are private to their authenticated owner.
REVOKE ALL ON TABLE public.emc_documents FROM anon;
REVOKE ALL ON TABLE public.emc_test_runs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.emc_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.emc_test_runs TO authenticated;

DROP POLICY IF EXISTS "Public Read emc_documents" ON public.emc_documents;
DROP POLICY IF EXISTS "Public Insert emc_documents" ON public.emc_documents;
DROP POLICY IF EXISTS "Public Update emc_documents" ON public.emc_documents;
DROP POLICY IF EXISTS "Public Read emc_test_runs" ON public.emc_test_runs;
DROP POLICY IF EXISTS "Public Insert emc_test_runs" ON public.emc_test_runs;
DROP POLICY IF EXISTS "Public Update emc_test_runs" ON public.emc_test_runs;
DROP POLICY IF EXISTS "Public Delete emc_test_runs" ON public.emc_test_runs;
DROP POLICY IF EXISTS "emc_documents_owner_all" ON public.emc_documents;
DROP POLICY IF EXISTS "emc_test_runs_owner_all" ON public.emc_test_runs;

CREATE POLICY "emc_documents_owner_all"
  ON public.emc_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "emc_test_runs_owner_all"
  ON public.emc_test_runs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
