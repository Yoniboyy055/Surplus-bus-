-- -----------------------------------------------------------------------------
-- MIGRATION: 037_canonical_lots_lot_snapshots.sql
-- PURPOSE: Canonical lot registry, point-in-time lot snapshots, and
--          per-source terminal-capability tracking.
-- -----------------------------------------------------------------------------

BEGIN;

-- =============================================================================
-- 1. public.canonical_lots
--    One row per unique lot (source × external_id). Stores the latest known
--    state plus, once finalised, the immutable outcome columns.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.canonical_lots (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source linkage
  source              TEXT        NOT NULL,           -- parser_key (e.g. 'ab_surplus')
  external_id         TEXT,
  source_id           UUID        REFERENCES public.sources(id) ON DELETE SET NULL,
  source_url          TEXT,

  -- Lot identity
  title               TEXT,
  status              TEXT        NOT NULL DEFAULT 'active',

  -- Live auction state (updated on each parser pass)
  current_price       NUMERIC,
  bid_count           INTEGER,
  closes_at           TIMESTAMPTZ,

  -- ── Final outcome columns (written once; immutable after first write) ──────
  final_price         NUMERIC,
  final_bid_count     INTEGER,
  final_price_source  TEXT,
  outcome             TEXT        CHECK (outcome IN ('sold', 'unsold', 'withdrawn')),
  finalized_at        TIMESTAMPTZ,
  outcome_currency    TEXT,
  -- ─────────────────────────────────────────────────────────────────────────

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_canonical_lots_source_status
  ON public.canonical_lots (source_id, status);

CREATE INDEX IF NOT EXISTS idx_canonical_lots_stale_open
  ON public.canonical_lots (source_id, closes_at)
  WHERE status IN ('active', 'closing_soon') AND final_price IS NULL;

-- Prevent overwriting final_price once it has been set.
CREATE OR REPLACE FUNCTION public.guard_canonical_lots_final_price()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.final_price IS NOT NULL AND NEW.final_price <> OLD.final_price THEN
    RAISE EXCEPTION 'final_price is immutable once set (lot id=%)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_final_price ON public.canonical_lots;
CREATE TRIGGER trg_guard_final_price
  BEFORE UPDATE ON public.canonical_lots
  FOR EACH ROW EXECUTE FUNCTION public.guard_canonical_lots_final_price();

-- =============================================================================
-- 2. public.lot_snapshots
--    One row per parser visit — a time-series of observed lot states.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.lot_snapshots (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id         UUID        NOT NULL REFERENCES public.canonical_lots(id) ON DELETE CASCADE,
  source_run_id  UUID        REFERENCES public.source_runs(id) ON DELETE SET NULL,

  current_price  NUMERIC,
  bid_count      INTEGER,
  status         TEXT        NOT NULL,
  is_terminal    BOOLEAN     NOT NULL DEFAULT false,
  observed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lot_snapshots_lot_id
  ON public.lot_snapshots (lot_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_lot_snapshots_terminal
  ON public.lot_snapshots (lot_id)
  WHERE is_terminal = true;

-- =============================================================================
-- 3. public.source_terminal_capabilities
--    Tracks whether a source publishes final sale results and, if so, whether
--    the agent must re-fetch individual lot pages to retrieve them.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.source_terminal_capabilities (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        UUID        NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  requires_revisit BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id)
);

-- =============================================================================
-- 4. RLS — service_role bypasses; authenticated users may SELECT
-- =============================================================================
ALTER TABLE public.canonical_lots              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_snapshots               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_terminal_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_lots_select ON public.canonical_lots;
CREATE POLICY canonical_lots_select ON public.canonical_lots
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS lot_snapshots_select ON public.lot_snapshots;
CREATE POLICY lot_snapshots_select ON public.lot_snapshots
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS source_terminal_caps_select ON public.source_terminal_capabilities;
CREATE POLICY source_terminal_caps_select ON public.source_terminal_capabilities
  FOR SELECT TO authenticated USING (true);

COMMIT;
