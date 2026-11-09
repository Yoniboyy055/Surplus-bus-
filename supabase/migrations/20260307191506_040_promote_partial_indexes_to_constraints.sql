
-- Drop constraints first (which drops their backing indexes)
ALTER TABLE public.source_records DROP CONSTRAINT IF EXISTS source_records_sourceid_urlhash_unique;
ALTER TABLE public.source_records DROP CONSTRAINT IF EXISTS source_records_sourceid_url_unique;
ALTER TABLE public.source_records DROP CONSTRAINT IF EXISTS uq_source_records_external;
ALTER TABLE public.source_records DROP CONSTRAINT IF EXISTS uq_source_records_urlhash;

-- Drop any remaining standalone indexes
DROP INDEX IF EXISTS public.idx_source_records_sourceid_urlhash;
DROP INDEX IF EXISTS public.uq_source_records_external;
DROP INDEX IF EXISTS public.uq_source_records_urlhash;

-- Branch A: unique constraint on (source_id, external_id) â non-null enforced by app/RPC
ALTER TABLE public.source_records
  ADD CONSTRAINT uq_source_records_external
  UNIQUE (source_id, external_id);

-- Branch B: unique constraint on (source_id, source_url_hash)
ALTER TABLE public.source_records
  ADD CONSTRAINT uq_source_records_urlhash
  UNIQUE (source_id, source_url_hash);

