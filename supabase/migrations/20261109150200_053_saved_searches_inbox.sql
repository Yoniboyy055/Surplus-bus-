-- =============================================================================
-- 053_saved_searches_inbox  (requires 051, 052)
-- Saved searches with opt-in alerts, and a per-user in-app inbox.
-- Inbox rows are written only by the server (alerts cron, service role).
-- Users may read their rows, mark them read (read_at only) and delete them.
-- Additive only; no existing table is changed except user_preferences gets
-- alert-email and marketing-email consent records (CASL).
-- Rollback: DROP TABLE public.inbox_items, public.saved_searches;
--           ALTER TABLE public.user_preferences DROP COLUMN alert_email_consent_at,
--             DROP COLUMN alert_email_consent_text, DROP COLUMN marketing_consent_at,
--             DROP COLUMN marketing_consent_text;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text,
  query text NOT NULL CHECK (char_length(query) BETWEEN 1 AND 200),
  scope text NOT NULL DEFAULT 'all' CHECK (scope IN ('all','sold','tenders')),
  province text,
  min_price numeric CHECK (min_price IS NULL OR min_price >= 0),
  max_price numeric CHECK (max_price IS NULL OR max_price >= 0),
  alert_frequency text NOT NULL DEFAULT 'off' CHECK (alert_frequency IN ('off','daily','weekly')),
  alert_email boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  last_alerted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_profile ON public.saved_searches (profile_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alerting ON public.saved_searches (alert_frequency) WHERE alert_frequency <> 'off';

CREATE TABLE IF NOT EXISTS public.inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_search_id uuid REFERENCES public.saved_searches(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('new_sold','new_tender','closing_soon','system')),
  title text NOT NULL,
  body text,
  url text,
  source_table text CHECK (source_table IN ('price_history_lots','tender_notices')),
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  emailed_at timestamptz
);
-- Non-partial so the alerts job can upsert with on_conflict (NULLs stay distinct
-- for system rows without a source).
CREATE UNIQUE INDEX IF NOT EXISTS uq_inbox_items_dedupe
  ON public.inbox_items (profile_id, saved_search_id, source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_inbox_items_profile_created ON public.inbox_items (profile_id, created_at DESC);

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS alert_email_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS alert_email_consent_text text,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent_text text;

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.saved_searches, public.inbox_items FROM anon;
REVOKE ALL ON public.inbox_items FROM authenticated;
GRANT SELECT, DELETE ON public.inbox_items TO authenticated;
GRANT UPDATE (read_at) ON public.inbox_items TO authenticated;
REVOKE ALL ON public.saved_searches FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_searches TO authenticated;
GRANT UPDATE (name, query, scope, province, min_price, max_price, alert_frequency, alert_email)
  ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches, public.inbox_items TO service_role;

DROP POLICY IF EXISTS saved_searches_own ON public.saved_searches;
CREATE POLICY saved_searches_own ON public.saved_searches FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS inbox_items_select_own ON public.inbox_items;
CREATE POLICY inbox_items_select_own ON public.inbox_items FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
DROP POLICY IF EXISTS inbox_items_update_own ON public.inbox_items;
CREATE POLICY inbox_items_update_own ON public.inbox_items FOR UPDATE TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS inbox_items_delete_own ON public.inbox_items;
CREATE POLICY inbox_items_delete_own ON public.inbox_items FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- Per-user cap: 25 saved searches (abuse guard for the alerts cron).
CREATE OR REPLACE FUNCTION public.saved_searches_cap()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF (SELECT count(*) FROM public.saved_searches WHERE profile_id = NEW.profile_id) >= 25 THEN
    RAISE EXCEPTION 'saved search limit reached (25)' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.saved_searches_cap() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_saved_searches_cap ON public.saved_searches;
CREATE TRIGGER trg_saved_searches_cap BEFORE INSERT ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.saved_searches_cap();

DROP TRIGGER IF EXISTS trg_saved_searches_updated_at ON public.saved_searches;
CREATE TRIGGER trg_saved_searches_updated_at BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
