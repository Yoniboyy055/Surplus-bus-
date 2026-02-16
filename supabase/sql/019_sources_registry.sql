-- -----------------------------------------------------------------------------
-- MIGRATION: 019_sources_registry.sql
-- PURPOSE: Source Registry for agent-driven ingestion. Agents read from DB.
-- -----------------------------------------------------------------------------

BEGIN;

-- =============================================================================
-- 1. public.sources
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('rfp', 'surplus', 'auction')),
  jurisdiction TEXT NOT NULL DEFAULT 'CA-FED',
  base_url TEXT NOT NULL,
  feed_url TEXT,
  parser_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetch_interval_minutes INT NOT NULL DEFAULT 1440,
  priority INT NOT NULL DEFAULT 100,
  robots_policy TEXT NOT NULL DEFAULT 'respect' CHECK (robots_policy IN ('respect', 'manual_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parser_key)
);

CREATE INDEX IF NOT EXISTS idx_sources_active_parser ON public.sources(is_active, parser_key, priority);

-- =============================================================================
-- 2. public.source_runs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.source_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failure')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  items_found INT NOT NULL DEFAULT 0,
  items_upserted INT NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_runs_recent ON public.source_runs(source_id, started_at DESC);

-- Allow opportunity_events to reference source_runs (agents write via service_role)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunity_events') THEN
    ALTER TABLE public.opportunity_events ADD COLUMN IF NOT EXISTS source_run_id UUID REFERENCES public.source_runs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- 3. RLS
-- =============================================================================
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_runs ENABLE ROW LEVEL SECURITY;

-- sources: SELECT authenticated; INSERT/UPDATE/DELETE operator only
DROP POLICY IF EXISTS sources_select_authenticated ON public.sources;
CREATE POLICY sources_select_authenticated ON public.sources
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sources_operator_all ON public.sources;
CREATE POLICY sources_operator_all ON public.sources
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
  );

-- source_runs: SELECT operator only; no client writes (agents use service_role)
DROP POLICY IF EXISTS source_runs_operator_select ON public.source_runs;
CREATE POLICY source_runs_operator_select ON public.source_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'operator')
  );

-- =============================================================================
-- 4. Seed Federal sources
-- =============================================================================
INSERT INTO public.sources (name, kind, jurisdiction, base_url, feed_url, parser_key, is_active, fetch_interval_minutes, priority)
VALUES
  ('GC Buyandsell', 'surplus', 'CA-FED', 'https://gcsurplus.ca', NULL, 'gc_buyandsell', true, 1440, 100),
  ('CanadaBuys', 'rfp', 'CA-FED', 'https://canadabuys.canada.ca', NULL, 'canadabuys', true, 1440, 100)
ON CONFLICT (parser_key) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  updated_at = now();

COMMIT;
