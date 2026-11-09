
-- ============================================================
-- MIGRATION: Source Recovery Plan â DB Layer
-- 1. Add quality_state + source_role to sources
-- 2. Add source_qualification_log for admission tracking
-- 3. Add deduplication constraint on source_records
-- 4. Disable dirty sources from canonical writes
-- ============================================================

-- Step 1: Add quality_state, source_role, real_host_url to sources
ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS quality_state     text NOT NULL DEFAULT 'gray'
    CHECK (quality_state IN ('green', 'yellow', 'red', 'gray')),
  ADD COLUMN IF NOT EXISTS source_role       text NOT NULL DEFAULT 'transaction'
    CHECK (source_role IN ('transaction', 'price_reference', 'discovery')),
  ADD COLUMN IF NOT EXISTS real_host_url     text NULL,
  ADD COLUMN IF NOT EXISTS production_ready  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disabled_at       timestamptz NULL,
  ADD COLUMN IF NOT EXISTS disabled_reason   text NULL;

COMMENT ON COLUMN public.sources.quality_state    IS 'green=clean real data | yellow=partial/recoverable | red=garbage/broken | gray=uninspected';
COMMENT ON COLUMN public.sources.source_role      IS 'transaction=real listings | price_reference=comps only | discovery=routing/portal only';
COMMENT ON COLUMN public.sources.real_host_url    IS 'Actual auction platform URL if city page redirects to vendor (GovDeals, PublicSurplus etc)';
COMMENT ON COLUMN public.sources.production_ready IS 'True only after passing source qualification gate. Guards canonical writes.';
COMMENT ON COLUMN public.sources.disabled_at      IS 'When this source was disabled from canonical ingest.';
COMMENT ON COLUMN public.sources.disabled_reason  IS 'Why this source was disabled.';

