-- -----------------------------------------------------------------------------
-- MIGRATION: 032_sources_sla_fields.sql
-- PURPOSE: SLA metadata for sources (no runtime change yet)
-- -----------------------------------------------------------------------------

BEGIN;

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS timeout_ms INT DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS rate_limit_per_minute INT DEFAULT 60;

COMMIT;
