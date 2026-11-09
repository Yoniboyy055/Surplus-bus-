
-- Safe upsert function for source_records
-- Handles duplicate url_hash gracefully by updating last_seen_at and payload if changed
CREATE OR REPLACE FUNCTION upsert_source_record(
  p_source_id UUID,
  p_source_run_id UUID,
  p_external_id TEXT,
  p_source_url TEXT,
  p_source_url_normalized TEXT,
  p_source_url_hash TEXT,
  p_raw_payload JSONB,
  p_payload_hash TEXT
)
RETURNS source_records AS $$
DECLARE
  result source_records;
BEGIN
  INSERT INTO source_records (
    id,
    source_id,
    source_run_id,
    external_id,
    source_url,
    source_url_normalized,
    source_url_hash,
    raw_payload,
    payload_hash,
    first_seen_at,
    last_seen_at,
    is_deleted
  ) VALUES (
    gen_random_uuid(),
    p_source_id,
    p_source_run_id,
    p_external_id,
    p_source_url,
    p_source_url_normalized,
    p_source_url_hash,
    p_raw_payload,
    p_payload_hash,
    NOW(),
    NOW(),
    false
  )
  ON CONFLICT (source_id, source_url_hash)
  DO UPDATE SET
    last_seen_at = NOW(),
    source_run_id = EXCLUDED.source_run_id,
    raw_payload = CASE 
      WHEN source_records.payload_hash != EXCLUDED.payload_hash 
      THEN EXCLUDED.raw_payload 
      ELSE source_records.raw_payload 
    END,
    payload_hash = CASE 
      WHEN source_records.payload_hash != EXCLUDED.payload_hash 
      THEN EXCLUDED.payload_hash 
      ELSE source_records.payload_hash 
    END,
    is_deleted = false
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

