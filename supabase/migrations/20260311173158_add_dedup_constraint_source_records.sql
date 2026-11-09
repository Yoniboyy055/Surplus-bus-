
-- Step 4: Enforce deduplication on source_records
-- Unique on (source_id, external_id) â prevents clone-per-run
-- First clean up existing nulls/duplicates so constraint can apply

-- Mark duplicate rows (keep earliest first_seen_at per source+external_id)
-- For rows where external_id IS NULL, we cannot deduplicate â flag them
ALTER TABLE public.source_records
  ADD COLUMN IF NOT EXISTS dedup_flag text NULL DEFAULT NULL;

-- Flag all rows with null external_id as unqualified
UPDATE public.source_records
SET dedup_flag = 'missing_external_id'
WHERE external_id IS NULL;

-- Add partial unique index: only enforces when external_id IS NOT NULL
-- (null rows are flagged but not blocked â parser must fix them)
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_records_source_external
  ON public.source_records (source_id, external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON INDEX uq_source_records_source_external IS
  'Prevents duplicate ingestion per source+external_id. Rows missing external_id are flagged separately.';

