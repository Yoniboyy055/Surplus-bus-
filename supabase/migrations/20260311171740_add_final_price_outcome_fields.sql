
ALTER TABLE public.canonical_lots
  ADD COLUMN IF NOT EXISTS final_price          numeric        NULL,
  ADD COLUMN IF NOT EXISTS final_bid_count      integer        NULL,
  ADD COLUMN IF NOT EXISTS final_price_source   text           NULL,
  ADD COLUMN IF NOT EXISTS outcome              text           NULL
    CHECK (outcome IN ('sold', 'unsold', 'withdrawn')),
  ADD COLUMN IF NOT EXISTS finalized_at         timestamptz    NULL,
  ADD COLUMN IF NOT EXISTS outcome_currency     text           NULL;

COMMENT ON COLUMN public.canonical_lots.final_price        IS 'Locked hammer/sale price at terminal state. Immutable once set.';
COMMENT ON COLUMN public.canonical_lots.final_bid_count    IS 'Total bid count at close. Immutable once set.';
COMMENT ON COLUMN public.canonical_lots.final_price_source IS 'Which source/parser surface confirmed the terminal value.';
COMMENT ON COLUMN public.canonical_lots.outcome            IS 'Terminal outcome: sold | unsold | withdrawn.';
COMMENT ON COLUMN public.canonical_lots.finalized_at       IS 'Timestamp when terminal state was recorded and locked.';
COMMENT ON COLUMN public.canonical_lots.outcome_currency   IS 'Currency of final_price. Defaults to canonical_lots.currency.';

