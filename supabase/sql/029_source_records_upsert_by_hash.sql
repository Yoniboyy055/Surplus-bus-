-- -----------------------------------------------------------------------------
-- MIGRATION: 029_source_records_upsert_by_hash.sql
-- PURPOSE: RPC for source_records upsert when external_id IS NULL (partial index)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.upsert_source_record_by_urlhash(
  p_source_id UUID,
  p_source_run_id UUID,
  p_source_url TEXT,
  p_source_url_normalized TEXT,
  p_source_url_hash TEXT,
  p_raw_payload JSONB,
  p_payload_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.source_records (
    source_id,
    source_run_id,
    external_id,
    source_url,
    source_url_normalized,
    source_url_hash,
    raw_payload,
    payload_hash,
    last_seen_at
  ) VALUES (
    p_source_id,
    p_source_run_id,
    NULL,
    p_source_url,
    p_source_url_normalized,
    p_source_url_hash,
    p_raw_payload,
    p_payload_hash,
    now()
  )
  ON CONFLICT (source_id, source_url_hash) WHERE (external_id IS NULL)
  DO UPDATE SET
    source_run_id = EXCLUDED.source_run_id,
    source_url = EXCLUDED.source_url,
    source_url_normalized = EXCLUDED.source_url_normalized,
    raw_payload = EXCLUDED.raw_payload,
    payload_hash = EXCLUDED.payload_hash,
    last_seen_at = EXCLUDED.last_seen_at,
    is_deleted = false,
    deleted_at = NULL;
END;
$$;
