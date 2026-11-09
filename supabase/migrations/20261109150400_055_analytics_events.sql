-- =============================================================================
-- 055_analytics_events  (requires 051; part of the 051-055 fix set)
-- Server-side product analytics for the 21 events in launch/data/events.json.
-- No personal information: no email, name, phone, IP or free text. user_id is an
-- opaque uuid (nulled if the profile is deleted). Inserts come only from route
-- handlers using the service role; clients can neither write nor read.
-- Rollback: DROP TABLE public.analytics_events;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_name text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT analytics_events_name_check CHECK (event_name IN (
    'page_viewed',
    'cta_clicked',
    'waitlist_joined',
    'signup_completed',
    'onboarding_completed',
    'feed_viewed',
    'opportunity_viewed',
    'score_reasons_expanded',
    'official_listing_clicked',
    'opportunity_saved',
    'opportunity_unsaved',
    'alert_rule_created',
    'alert_rule_updated',
    'alert_rule_deleted',
    'inbox_opened',
    'inbox_item_opened',
    'source_status_viewed',
    'pricing_viewed',
    'checkout_started',
    'subscription_started',
    'marketing_email_pref_changed'
  )),
  CONSTRAINT analytics_events_props_object CHECK (jsonb_typeof(props) = 'object'),
  CONSTRAINT analytics_events_props_size CHECK (octet_length(props::text) <= 2048),
  CONSTRAINT analytics_events_session_len CHECK (session_id IS NULL OR length(session_id) <= 64)
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created ON public.analytics_events (event_name, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
DROP POLICY IF EXISTS server_only_no_client_access ON public.analytics_events;
CREATE POLICY server_only_no_client_access ON public.analytics_events
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.analytics_events IS
  'Product analytics (launch/data/events.json). No PII. Insert via service role only.';

COMMIT;
