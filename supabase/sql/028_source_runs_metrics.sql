-- -----------------------------------------------------------------------------
-- MIGRATION: 028_source_runs_metrics.sql
-- PURPOSE: Add items_created, items_updated for run metrics
-- -----------------------------------------------------------------------------

BEGIN;

ALTER TABLE public.source_runs
  ADD COLUMN IF NOT EXISTS items_created INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_updated INT DEFAULT 0;

COMMIT;
