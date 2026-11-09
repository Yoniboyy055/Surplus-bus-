
-- Backfill final_price, final_bid_count, outcome, finalized_at
-- from the most recent terminal snapshot per lot where is_terminal = true

WITH terminal AS (
  SELECT DISTINCT ON (canonical_lot_id)
    canonical_lot_id,
    current_price,
    bid_count,
    status,
    observed_at
  FROM public.lot_snapshots
  WHERE is_terminal = true
  ORDER BY canonical_lot_id, observed_at DESC
)
UPDATE public.canonical_lots cl
SET
  final_price       = t.current_price,
  final_bid_count   = t.bid_count,
  outcome           = CASE
                        WHEN t.status = 'sold'      THEN 'sold'
                        WHEN t.status = 'unsold'    THEN 'unsold'
                        WHEN t.status = 'withdrawn' THEN 'withdrawn'
                        ELSE NULL
                      END,
  finalized_at      = t.observed_at,
  final_price_source = 'backfill_from_terminal_snapshot'
FROM terminal t
WHERE cl.id = t.canonical_lot_id
  AND cl.final_price IS NULL;

