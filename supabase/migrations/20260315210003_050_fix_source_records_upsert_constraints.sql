
-- ============================================================
-- Migration 050: Fix source_records upsert â complete constraint repair
-- 
-- Problem: upsert_source_record_by_urlhash Branch A uses
--   ON CONFLICT (source_id, external_id)
-- which requires a named CONSTRAINT, not just an index.
-- We dropped the non-partial constraint in 049 but the partial
-- index uq_source_records_source_external cannot serve ON CONFLICT
-- without being promoted to a constraint.
--
-- Fix:
--   1. Add a proper partial UNIQUE CONSTRAINT for Branch A
--   2. Drop the now-redundant standalone partial index
--   3. Replace upsert_source_record_by_urlhash to use the
--      correct ON CONFLICT syntax for both branches
-- ============================================================

-- Step 1: Drop the standalone partial index (will be replaced by constraint)
DROP INDEX IF EXISTS public.uq_source_records_source_external;

-- Step 2: Add proper partial UNIQUE CONSTRAINT for Branch A
-- This is what ON CONFLICT (source_id, external_id) WHERE external_id IS NOT NULL requires
ALTER TABLE public.source_records
  ADD CONSTRAINT uq_source_records_source_external
  UNIQUE (source_id, external_id);

-- Note: A full (non-partial) unique constraint on (source_id, external_id) is correct here
-- because external_id NULLs are never equal to each other in Postgres UNIQUE constraints
-- NULL != NULL in unique indexes â so two rows with external_id = NULL will NOT conflict
-- This is safe and correct behavior

-- Step 3: Replace the upsert function with corrected Branch A syntax
CREATE OR REPLACE FUNCTION public.upsert_source_record_by_urlhash(
  p_source_id          uuid,
  p_source_run_id      uuid,
  p_source_url         text,
  p_source_url_normalized text,
  p_source_url_hash    text,
  p_raw_payload        jsonb,
  p_payload_hash       text,
  p_seen_at            timestamptz DEFAULT NULL,
  p_external_id        text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id  uuid;
  v_now timestamptz := COALESCE(p_seen_at, NOW());
BEGIN

  IF p_external_id IS NOT NULL THEN
    -- Branch A: stable external_id supplied by source
    -- Uses constraint uq_source_records_source_external: UNIQUE (source_id, external_id)
    INSERT INTO public.source_records (
      source_id, source_run_id, external_id,
      source_url, source_url_normalized, source_url_hash,
      raw_payload, payload_hash,
      first_seen_at, last_seen_at, is_deleted, deleted_at
    ) VALUES (
      p_source_id, p_source_run_id, p_external_id,
      p_source_url, p_source_url_normalized, p_source_url_hash,
      p_raw_payload, p_payload_hash,
      v_now, v_now, false, NULL
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
    -- Branch B: no external_id â use URL hash identity
    -- Uses partial index uq_source_records_urlhash_no_extid:
    --   UNIQUE (source_id, source_url_hash) WHERE external_id IS NULL
    INSERT INTO public.source_records (
      source_id, source_run_id, external_id,
      source_url, source_url_normalized, source_url_hash,
      raw_payload, payload_hash,
      first_seen_at, last_seen_at, is_deleted, deleted_at
    ) VALUES (
      p_source_id, p_source_run_id, NULL,
      p_source_url, p_source_url_normalized, p_source_url_hash,
      p_raw_payload, p_payload_hash,
      v_now, v_now, false, NULL
    )
    ON CONFLICT (source_id, source_url_hash)
    WHERE (external_id IS NULL)
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

