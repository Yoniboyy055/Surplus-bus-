-- -----------------------------------------------------------------------------
-- MIGRATION: 017_intelligence_app_mvp.sql
-- PURPOSE: Intelligence-only app MVP — add feed/inbox/saved/content tables
--          and RLS for "everything inside app gated behind login".
-- PREREQUISITE: 015, 016 applied. Does NOT drop legacy tables (use 018 for that).
--
-- NOTE: Agent cron jobs write via service_role only. No client write policies
--       for intelligence tables (opportunities, opportunity_events, etc.).
-- -----------------------------------------------------------------------------

BEGIN;

-- =============================================================================
-- 1. RENAME: buyer_agency → issuing_entity (if column exists)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'buyer_agency'
  ) THEN
    ALTER TABLE public.opportunities RENAME COLUMN buyer_agency TO issuing_entity;
    COMMENT ON COLUMN public.opportunities.issuing_entity IS 'Procuring/issuing organization. Not buyer/seller.';
  END IF;
END $$;

-- =============================================================================
-- 2. NEW TABLE: saved_opportunities (subscriber feature)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.saved_opportunities (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_opportunities_profile ON public.saved_opportunities(profile_id);
CREATE INDEX IF NOT EXISTS idx_saved_opportunities_opportunity ON public.saved_opportunities(opportunity_id);

-- =============================================================================
-- 3. NEW TABLE: alert_matches (powers /inbox)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.alert_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_id UUID REFERENCES public.ingestion_runs(id) ON DELETE SET NULL,
  UNIQUE(alert_rule_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_matches_rule ON public.alert_matches(alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_matches_profile ON public.alert_matches(profile_id);
CREATE INDEX IF NOT EXISTS idx_alert_matches_opportunity ON public.alert_matches(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_alert_matches_matched_at ON public.alert_matches(matched_at DESC);

-- =============================================================================
-- 4. NEW TABLE: opportunity_events (feed timeline)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.opportunity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'updated', 'status_changed', 'value_changed', 'closing_changed'
  )),
  diff JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_id UUID REFERENCES public.ingestion_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_opportunity_events_opportunity ON public.opportunity_events(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_events_detected ON public.opportunity_events(detected_at DESC);

-- =============================================================================
-- 5. NEW TABLE: content_posts (in-app news/blog by agents)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  body_md TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  authored_by_agent BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_posts_status ON public.content_posts(status);
CREATE INDEX IF NOT EXISTS idx_content_posts_published ON public.content_posts(published_at DESC) WHERE status = 'published';

-- =============================================================================
-- 6. RLS: Enable and add policies (no client write policies for intelligence)
-- =============================================================================

-- opportunities: SELECT to authenticated only
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opportunities_authenticated_read ON public.opportunities;
CREATE POLICY opportunities_authenticated_read ON public.opportunities
  FOR SELECT TO authenticated USING (true);

-- opportunity_history: SELECT to authenticated only
ALTER TABLE public.opportunity_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opportunity_history_authenticated_read ON public.opportunity_history;
CREATE POLICY opportunity_history_authenticated_read ON public.opportunity_history
  FOR SELECT TO authenticated USING (true);

-- opportunity_features: SELECT to authenticated only
ALTER TABLE public.opportunity_features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opportunity_features_authenticated_read ON public.opportunity_features;
CREATE POLICY opportunity_features_authenticated_read ON public.opportunity_features
  FOR SELECT TO authenticated USING (true);

-- opportunity_events: SELECT to authenticated only
ALTER TABLE public.opportunity_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opportunity_events_authenticated_read ON public.opportunity_events;
CREATE POLICY opportunity_events_authenticated_read ON public.opportunity_events
  FOR SELECT TO authenticated USING (true);

-- content_posts: SELECT to authenticated only WHERE status='published'
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_posts_read_published ON public.content_posts;
CREATE POLICY content_posts_read_published ON public.content_posts
  FOR SELECT TO authenticated USING (status = 'published');

-- user_preferences: SELECT/INSERT/UPDATE only for profile_id = auth.uid()
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_preferences_own ON public.user_preferences;
CREATE POLICY user_preferences_select ON public.user_preferences
  FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY user_preferences_insert ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY user_preferences_update ON public.user_preferences
  FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- alert_rules: CRUD only for profile_id = auth.uid()
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alert_rules_own ON public.alert_rules;
CREATE POLICY alert_rules_own ON public.alert_rules
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- saved_opportunities: SELECT/INSERT/DELETE only for profile_id = auth.uid()
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saved_opportunities_own ON public.saved_opportunities;
CREATE POLICY saved_opportunities_select ON public.saved_opportunities
  FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY saved_opportunities_insert ON public.saved_opportunities
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY saved_opportunities_delete ON public.saved_opportunities
  FOR DELETE TO authenticated USING (profile_id = auth.uid());

-- alert_matches: SELECT only for profile_id = auth.uid()
ALTER TABLE public.alert_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alert_matches_via_rule ON public.alert_matches;
DROP POLICY IF EXISTS alert_matches_profile ON public.alert_matches;
CREATE POLICY alert_matches_profile ON public.alert_matches
  FOR SELECT TO authenticated USING (profile_id = auth.uid());
-- Inserts: service_role only (no policy for authenticated)

-- Indexes for performance (events timeline, features score, saved/profile, matches/profile)
CREATE INDEX IF NOT EXISTS idx_opportunity_features_score ON public.opportunity_features(normalized_score DESC);

COMMIT;
