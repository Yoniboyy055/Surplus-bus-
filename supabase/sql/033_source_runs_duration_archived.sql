-- -----------------------------------------------------------------------------
-- MIGRATION: 033_source_runs_duration_archived.sql
-- PURPOSE: duration_ms and items_archived for source_runs
-- -----------------------------------------------------------------------------

BEGIN;

ALTER TABLE public.source_runs
  ADD COLUMN IF NOT EXISTS duration_ms INT,
  ADD COLUMN IF NOT EXISTS items_archived INT DEFAULT 0;

COMMIT;
