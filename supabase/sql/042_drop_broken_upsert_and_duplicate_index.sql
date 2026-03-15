-- -----------------------------------------------------------------------------
-- MIGRATION: 042_drop_broken_upsert_and_duplicate_index.sql
-- PURPOSE: Drop broken upsert_source_record function and duplicate index
-- -----------------------------------------------------------------------------

BEGIN;

-- Drop the broken old upsert function (if it exists)
DROP FUNCTION IF EXISTS public.upsert_source_record(uuid, uuid, text, text, text, text, jsonb, text);

-- Drop the non-partial unique index on (source_id, external_id)
DROP INDEX IF EXISTS public.uq_source_records_external;

COMMIT;
