-- -----------------------------------------------------------------------------
-- MIGRATION: 037_source_records_fk_set_null.sql
-- PURPOSE: Change source_records.source_run_id FK from ON DELETE CASCADE to
--          ON DELETE SET NULL so deleting a source_run does not hard-wipe the
--          staged records. Also makes the column nullable.
-- -----------------------------------------------------------------------------

BEGIN;

ALTER TABLE public.source_records
  ALTER COLUMN source_run_id DROP NOT NULL;

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT constraint_name INTO fk_name
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name = 'source_records'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name IN (
      SELECT constraint_name
      FROM information_schema.constraint_column_usage
      WHERE table_schema = 'public'
        AND table_name   = 'source_runs'
        AND column_name  = 'id'
    )
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.source_records DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.source_records
  ADD CONSTRAINT source_records_source_run_id_fkey
  FOREIGN KEY (source_run_id) REFERENCES public.source_runs(id) ON DELETE SET NULL;

COMMIT;
