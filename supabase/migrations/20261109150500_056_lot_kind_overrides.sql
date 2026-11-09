-- =============================================================================
-- 056_lot_kind_overrides  (OPTIONAL; NOT APPLIED. Needs Yonatan's approval.)
-- A database copy of data/kind_overrides.csv, for when overrides should be
-- editable without a deploy. The app does NOT read this table yet: the repo CSV
-- (compiled into lib/opendata/kindOverrides.generated.ts) is the source of truth.
-- To fill it from the CSV:  npx tsx scripts/build-kind-overrides.ts --sql
-- Source rows in price_history_lots are never edited or deleted.
-- No personal information. Server-only (service role); clients can neither read
-- nor write.
-- Rollback: DROP TABLE public.lot_kind_overrides;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.lot_kind_overrides (
  feed_key text NOT NULL,
  external_id text NOT NULL,
  -- NULL kind = keep the rule-based kind (used with hide_from_comps).
  kind text,
  hide_from_comps boolean NOT NULL DEFAULT false,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feed_key, external_id),
  CONSTRAINT lot_kind_overrides_feed_check CHECK (feed_key IN ('gcsurplus_sold', 'ns_surplus')),
  CONSTRAINT lot_kind_overrides_kind_check CHECK (kind IS NULL OR kind IN (
    'vehicle', 'heavy_truck', 'powersport', 'equipment', 'trailer', 'electronics', 'property', 'part', 'bulk', 'other'
  )),
  CONSTRAINT lot_kind_overrides_does_something CHECK (kind IS NOT NULL OR hide_from_comps),
  CONSTRAINT lot_kind_overrides_reason_len CHECK (length(reason) BETWEEN 5 AND 500),
  CONSTRAINT lot_kind_overrides_id_len CHECK (length(external_id) BETWEEN 1 AND 80)
);

ALTER TABLE public.lot_kind_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lot_kind_overrides FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lot_kind_overrides TO service_role;
DROP POLICY IF EXISTS server_only_no_client_access ON public.lot_kind_overrides;
CREATE POLICY server_only_no_client_access ON public.lot_kind_overrides
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.lot_kind_overrides IS
  'Optional DB copy of data/kind_overrides.csv: per-row kind fixes or hide_from_comps. No PII. Service role only.';

COMMIT;
