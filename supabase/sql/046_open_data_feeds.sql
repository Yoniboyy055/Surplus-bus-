-- Migration 046: Open-data feeds (GCSurplus sold history, CanadaBuys tenders, NS surplus history)
-- Licences: OGL–Canada / OGL–Nova Scotia. No placeholder rows. Service role writes only.
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS public.open_data_ingest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_key TEXT NOT NULL,
  source_url TEXT NOT NULL,
  licence_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'skipped')),
  rows_parsed INT NOT NULL DEFAULT 0,
  rows_upserted INT NOT NULL DEFAULT 0,
  error_message TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_open_data_ingest_runs_feed
  ON public.open_data_ingest_runs (feed_key, retrieved_at DESC);

-- GCSurplus sold + NS history (price comps). Personal contact columns intentionally absent.
CREATE TABLE IF NOT EXISTS public.price_history_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  feed_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sold_amount NUMERIC,
  min_bid_amount NUMERIC,
  closing_date DATE,
  province TEXT,
  city TEXT,
  category TEXT,
  kind TEXT,
  fiscal_year TEXT,
  file_number TEXT,
  -- No awarded_to / paid_party: NS awardee and payer names can be personal
  -- information (outside OGL–NS); dropped at parse time (PR #28 review).
  source_url TEXT NOT NULL,
  licence_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sold',
  raw_hash TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (feed_key, external_id)
);

CREATE INDEX IF NOT EXISTS idx_price_history_lots_province ON public.price_history_lots (province);
CREATE INDEX IF NOT EXISTS idx_price_history_lots_closing ON public.price_history_lots (closing_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_price_history_lots_sold ON public.price_history_lots (sold_amount DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_price_history_lots_feed ON public.price_history_lots (feed_key);

-- CanadaBuys open/closed tender notices from official CSV only.
CREATE TABLE IF NOT EXISTS public.tender_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  feed_key TEXT NOT NULL DEFAULT 'canadabuys',
  reference_number TEXT,
  solicitation_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  province TEXT,
  category TEXT,
  procurement_category TEXT,
  notice_type TEXT,
  issuing_entity TEXT,
  source_url TEXT NOT NULL,
  publication_date DATE,
  closing_date TIMESTAMPTZ,
  licence_id TEXT NOT NULL,
  regions_of_delivery TEXT,
  score NUMERIC,
  score_parts JSONB,
  score_reasons TEXT[],
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (feed_key, external_id)
);

CREATE INDEX IF NOT EXISTS idx_tender_notices_status ON public.tender_notices (status);
CREATE INDEX IF NOT EXISTS idx_tender_notices_closing ON public.tender_notices (closing_date);
CREATE INDEX IF NOT EXISTS idx_tender_notices_score ON public.tender_notices (score DESC NULLS LAST);

-- Optional user follows of watchlist directory entries (no scraped lots).
CREATE TABLE IF NOT EXISTS public.watchlist_follows (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  watchlist_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, watchlist_id)
);

ALTER TABLE public.open_data_ingest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_follows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'price_history_lots' AND policyname = 'price_history_authenticated_read'
  ) THEN
    CREATE POLICY price_history_authenticated_read ON public.price_history_lots
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tender_notices' AND policyname = 'tender_notices_authenticated_read'
  ) THEN
    CREATE POLICY tender_notices_authenticated_read ON public.tender_notices
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'watchlist_follows' AND policyname = 'watchlist_follows_own'
  ) THEN
    CREATE POLICY watchlist_follows_own ON public.watchlist_follows
      FOR ALL TO authenticated
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'open_data_ingest_runs' AND policyname = 'open_data_ingest_runs_authenticated_read'
  ) THEN
    CREATE POLICY open_data_ingest_runs_authenticated_read ON public.open_data_ingest_runs
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

COMMENT ON TABLE public.price_history_lots IS 'OGL sold/award history only. No live scraped auctions. Attribution required in UI.';
COMMENT ON TABLE public.tender_notices IS 'CanadaBuys open-data CSV only (robots Disallow:/ for HTML). OGL–Canada attribution required.';

COMMIT;
