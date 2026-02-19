-- -----------------------------------------------------------------------------
-- MIGRATION: 031_source_run_failures.sql
-- PURPOSE: Retry classification and failure logging
-- -----------------------------------------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS public.source_run_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_run_id UUID REFERENCES public.source_runs(id) ON DELETE CASCADE,
  error_class TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_run_failures_run ON public.source_run_failures(source_run_id);

COMMIT;
