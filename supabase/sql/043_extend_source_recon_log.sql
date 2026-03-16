-- Migration 043: Extend source_recon_log for recon_runner.py
-- Adds columns that recon_runner.py writes but don't exist yet.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS.
-- Does NOT drop or rename existing columns.

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
