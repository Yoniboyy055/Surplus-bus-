
-- Drop the old broken upsert function
DROP FUNCTION IF EXISTS public.upsert_source_record(
  uuid, uuid, text, text, text, text, jsonb, text
);

-- The non-partial external_id index is backed by a constraint, not a standalone index
-- Must drop the constraint directly â Postgres will drop the backing index automatically
ALTER TABLE public.source_records
  DROP CONSTRAINT IF EXISTS uq_source_records_external;

