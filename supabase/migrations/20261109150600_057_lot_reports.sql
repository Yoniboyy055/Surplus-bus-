-- =============================================================================
-- 057_lot_reports  (NOT APPLIED. Needs Yonatan's approval.)
-- "Report a wrong result" on sold-lot rows. Anonymous by design: no user id,
-- email, name, IP address or user agent is stored. The optional note is free
-- text the reporter types; the form asks them not to include personal details,
-- and it is capped at 500 characters. Inserts come only from POST /api/lot-reports
-- (service role, rate limited); clients can neither read nor write directly.
-- Until this is applied the route answers 503 and the form says reporting is not
-- switched on yet.
-- Rollback: DROP TABLE public.lot_reports;
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.lot_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  feed_key text NOT NULL,
  external_id text NOT NULL,
  reason text NOT NULL,
  suggested_kind text,
  note text,
  status text NOT NULL DEFAULT 'new',
  CONSTRAINT lot_reports_feed_check CHECK (feed_key IN ('gcsurplus_sold', 'ns_surplus')),
  CONSTRAINT lot_reports_id_len CHECK (length(external_id) BETWEEN 1 AND 80),
  CONSTRAINT lot_reports_reason_check CHECK (reason IN ('wrong_kind', 'odd_price', 'not_an_item', 'duplicate', 'other')),
  CONSTRAINT lot_reports_kind_check CHECK (suggested_kind IS NULL OR suggested_kind IN (
    'vehicle', 'heavy_truck', 'powersport', 'equipment', 'trailer', 'electronics', 'property', 'part', 'bulk', 'other'
  )),
  CONSTRAINT lot_reports_note_len CHECK (note IS NULL OR length(note) <= 500),
  CONSTRAINT lot_reports_status_check CHECK (status IN ('new', 'fixed', 'dismissed'))
);
CREATE INDEX IF NOT EXISTS idx_lot_reports_lot_created ON public.lot_reports (feed_key, external_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lot_reports_status_created ON public.lot_reports (status, created_at DESC);

ALTER TABLE public.lot_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lot_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lot_reports TO service_role;
DROP POLICY IF EXISTS server_only_no_client_access ON public.lot_reports;
CREATE POLICY server_only_no_client_access ON public.lot_reports
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.lot_reports IS
  'Anonymous "report a wrong result" flags on sold lots. No PII columns. Insert via service role only.';

COMMIT;
