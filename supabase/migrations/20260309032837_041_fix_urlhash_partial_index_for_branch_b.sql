
-- The current uq_source_records_urlhash is a full UNIQUE constraint on (source_id, source_url_hash)
-- But Branch B uses: ON CONFLICT (source_id, source_url_hash) WHERE (external_id IS NULL)
-- A conditional ON CONFLICT requires a matching PARTIAL index, not a full constraint.
--
-- Strategy:
-- Keep uq_source_records_external as-is (full unique constraint, Branch A is correct)
-- Replace uq_source_records_urlhash with a PARTIAL unique index WHERE external_id IS NULL

-- Step 1: Drop the full unique constraint on urlhash
ALTER TABLE public.source_records
  DROP CONSTRAINT IF EXISTS uq_source_records_urlhash;

-- Step 2: Create the correct partial unique index
-- This matches exactly what Branch B's ON CONFLICT clause expects
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_records_urlhash_no_extid
  ON public.source_records (source_id, source_url_hash)
  WHERE (external_id IS NULL);

