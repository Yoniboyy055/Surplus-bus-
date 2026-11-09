
-- Drop the two stale overloads, keep only the correct 9-param version (with p_external_id)

-- Overload 1: old 6-param version (p_source_id_text text, ...)
DROP FUNCTION IF EXISTS public.upsert_source_record_by_urlhash(
  text, text, text, jsonb, text, timestamptz
);

-- Overload 2: old 8-param version (p_source_id uuid, no p_external_id)
DROP FUNCTION IF EXISTS public.upsert_source_record_by_urlhash(
  uuid, uuid, text, text, text, jsonb, text, timestamptz
);

