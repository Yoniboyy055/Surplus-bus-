-- -----------------------------------------------------------------------------
-- MIGRATION: 027_source_records_drop_lookup_key.sql
-- PURPOSE: Remove lookup_key; use Approach A (partial indexes only)
-- -----------------------------------------------------------------------------

BEGIN;

DROP INDEX IF EXISTS public.uq_source_records_lookup;
ALTER TABLE public.source_records DROP COLUMN IF EXISTS lookup_key;

COMMIT;
