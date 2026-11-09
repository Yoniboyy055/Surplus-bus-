-- Migration 043: Extend source_recon_log for recon_runner.py
-- Adds columns that recon_runner.py writes but don't exist yet.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS.
-- Does NOT drop or rename existing columns.

-- (2026-11-09) source_recon_log was created outside the repo on the live DB, so a
-- fresh replay failed here with "relation source_recon_log does not exist".
-- Create the base table only if missing (no-op where it already exists).
-- Base columns = what app/api/agents/recon/route.ts inserts.
CREATE TABLE IF NOT EXISTS public.source_recon_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            uuid REFERENCES public.sources(id) ON DELETE CASCADE,
  phase                text,
  sandbox_mode         boolean NOT NULL DEFAULT true,
  discovered_host_url  text,
  vendor_family        text,
  outcome              text,
  notes                text,
  run_at               timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.source_recon_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS checked_at           TIMESTAMPTZ;
ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS checked_by           TEXT;
ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS real_listings_found   BOOLEAN;
ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS stable_external_id   BOOLEAN;
ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS core_fields_present  BOOLEAN;
ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS dedup_verified       BOOLEAN;
ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS terminal_state_plan  BOOLEAN;
ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS consecutive_runs_ok  INTEGER DEFAULT 0;
ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS gate_passed          BOOLEAN;
ALTER TABLE source_recon_log ADD COLUMN IF NOT EXISTS real_host_discovered TEXT;
