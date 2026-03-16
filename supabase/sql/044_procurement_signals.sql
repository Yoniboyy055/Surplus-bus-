-- Migration 044: Create procurement_signals table
-- Standalone signal storage for canadabuys_signal.py.
-- Does NOT modify the existing opportunity_intelligence table.
-- Idempotent: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS procurement_signals (
  id                  TEXT PRIMARY KEY,
  source_id           UUID REFERENCES sources(id),
  signal_type         TEXT NOT NULL,
  signal_strength     TEXT NOT NULL,
  reference_id        TEXT NOT NULL,
  title               TEXT NOT NULL,
  department          TEXT,
  jurisdiction        TEXT NOT NULL DEFAULT 'CA-FED',
  estimated_value     NUMERIC,
  currency            TEXT NOT NULL DEFAULT 'CAD',
  rationale           TEXT,
  source_url          TEXT,
  published_at        TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT procurement_signals_signal_type_check
    CHECK (signal_type IN ('cancellation', 'expiry', 'equipment_acquisition')),

  CONSTRAINT procurement_signals_signal_strength_check
    CHECK (signal_strength IN ('high', 'medium', 'low'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_procurement_signals_signal_type
  ON procurement_signals (signal_type);

CREATE INDEX IF NOT EXISTS idx_procurement_signals_signal_strength
  ON procurement_signals (signal_strength);

CREATE INDEX IF NOT EXISTS idx_procurement_signals_jurisdiction
  ON procurement_signals (jurisdiction);

CREATE INDEX IF NOT EXISTS idx_procurement_signals_published_at
  ON procurement_signals (published_at);

-- RLS
ALTER TABLE procurement_signals ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'procurement_signals'
      AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON procurement_signals
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
