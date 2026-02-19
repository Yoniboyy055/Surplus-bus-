-- -----------------------------------------------------------------------------
-- MIGRATION: 025_source_records.sql
-- PURPOSE: Staged ingestion with source_records, payload hashing, parser lock
-- -----------------------------------------------------------------------------

BEGIN;

-- =============================================================================
-- 1. public.source_records (staging table for change detection)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  source_run_id UUID NOT NULL REFERENCES public.source_runs(id) ON DELETE CASCADE,

  external_id TEXT,
  source_url TEXT NOT NULL,
  source_url_normalized TEXT NOT NULL,
  source_url_hash TEXT NOT NULL,

  raw_payload JSONB NOT NULL,
  payload_hash TEXT NOT NULL,

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  is_deleted BOOLEAN NOT NULL DEFAULT false,

  -- lookup_key for unified upsert: external_id when present, else source_url_hash
  lookup_key TEXT NOT NULL
);

-- Deduping rules (partial indexes per spec)
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_records_external
ON public.source_records(source_id, external_id)
WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_source_records_urlhash
ON public.source_records(source_id, source_url_hash)
WHERE external_id IS NULL;

-- Unified lookup for upsert (covers both cases)
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_records_lookup
ON public.source_records(source_id, lookup_key);

CREATE INDEX IF NOT EXISTS idx_source_records_recent
ON public.source_records(source_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_records_payload_hash
ON public.source_records(payload_hash);

-- =============================================================================
-- 2. Parser concurrency lock (advisory locks)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.acquire_parser_lock(p_parser_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_key BIGINT;
BEGIN
  v_key := hashtext(p_parser_key);
  RETURN pg_try_advisory_lock(v_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_parser_lock(p_parser_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_key BIGINT;
BEGIN
  v_key := hashtext(p_parser_key);
  PERFORM pg_advisory_unlock(v_key);
END;
$$;

COMMIT;
