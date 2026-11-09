
-- Migration 038: Extend upsert_source_record_by_urlhash to support external_id
-- Adds p_external_id parameter, dual conflict-target branching, soft-delete revival
-- Safe: CREATE OR REPLACE drops nothing, changes only function behavior
-- Canonical conflict contracts:
--   external_id IS NOT NULL â ON CONFLICT (source_id, external_id)
--   external_id IS NULL     â ON CONFLICT (source_id, source_url_hash) WHERE (external_id IS NULL)

CREATE OR REPLACE FUNCTION public.upsert_source_record_by_urlhash(
  p_source_id             UUID,
  p_source_run_id         UUID,
  p_source_url            TEXT,
  p_source_url_normalized TEXT,
  p_source_url_hash       TEXT,
  p_raw_payload           JSONB,
  p_payload_hash          TEXT,
  p_seen_at               TIMESTAMPTZ DEFAULT NULL,
  p_external_id           TEXT        DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ := COALESCE(p_seen_at, NOW());
BEGIN

  IF p_external_id IS NOT NULL THEN
    -- Branch A: stable external identity supplied by source
    INSERT INTO public.source_records (
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
      is_deleted,
      deleted_at
    ) VALUES (
      p_source_id,
      p_source_run_id,
      p_external_id,
      p_source_url,
      p_source_url_normalized,
      p_source_url_hash,
      p_raw_payload,
      p_payload_hash,
      v_now,
      v_now,
      false,
      NULL
    )
    ON CONFLICT (source_id, external_id)
    DO UPDATE SET
      source_run_id         = EXCLUDED.source_run_id,
      source_url            = EXCLUDED.source_url,
      source_url_normalized = EXCLUDED.source_url_normalized,
      source_url_hash       = EXCLUDED.source_url_hash,
      raw_payload           = EXCLUDED.raw_payload,
      payload_hash          = EXCLUDED.payload_hash,
      last_seen_at          = EXCLUDED.last_seen_at,
      is_deleted            = false,
      deleted_at            = NULL
    RETURNING id INTO v_id;

  ELSE
    -- Branch B: no external ID, use URL-hash identity
    INSERT INTO public.source_records (
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
      is_deleted,
      deleted_at
    ) VALUES (
      p_source_id,
      p_source_run_id,
      NULL,
      p_source_url,
      p_source_url_normalized,
      p_source_url_hash,
      p_raw_payload,
      p_payload_hash,
      v_now,
      v_now,
      false,
      NULL
    )
    ON CONFLICT (source_id, source_url_hash) WHERE (external_id IS NULL)
    DO UPDATE SET
      source_run_id         = EXCLUDED.source_run_id,
      source_url            = EXCLUDED.source_url,
      source_url_normalized = EXCLUDED.source_url_normalized,
      raw_payload           = EXCLUDED.raw_payload,
      payload_hash          = EXCLUDED.payload_hash,
      last_seen_at          = EXCLUDED.last_seen_at,
      is_deleted            = false,
      deleted_at            = NULL
    RETURNING id INTO v_id;

  END IF;

  RETURN v_id;
END;
$$;

-- Grant execution to authenticated and service roles
GRANT EXECUTE ON FUNCTION public.upsert_source_record_by_urlhash(
  UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ, TEXT
) TO authenticated, service_role;

