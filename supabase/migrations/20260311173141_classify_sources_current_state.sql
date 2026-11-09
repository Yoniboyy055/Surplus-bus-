
-- Step 2: Apply current reality classification to all 11 sources

-- RED sources â disable from canonical ingest immediately
UPDATE public.sources SET
  quality_state    = 'red',
  source_role      = 'discovery',
  production_ready = false,
  is_active        = false,
  disabled_at      = now(),
  disabled_reason  = 'Scraping page navigation HTML (footer, nav, chrome) instead of real listings. Likely redirects to third-party auction vendor. Needs source reconnaissance before re-enabling.'
WHERE parser_key IN ('city_calgary_surplus', 'city_edmonton_surplus', 'city_ottawa_surplus');

UPDATE public.sources SET
  quality_state    = 'red',
  source_role      = 'transaction',
  production_ready = false,
  is_active        = false,
  disabled_at      = now(),
  disabled_reason  = 'Ingesting duplicate seeded/placeholder rows. Same record cloned per run. external_id enforcement not working. Needs parser rewrite + dedup fix.'
WHERE parser_key IN ('ab_surplus', 'canadabuys', 'city_toronto_surplus', 'gc_buyandsell', 'on_surplus');

-- GRAY sources â uninspected, not firing
UPDATE public.sources SET
  quality_state    = 'gray',
  source_role      = 'transaction',
  production_ready = false,
  is_active        = false,
  disabled_at      = now(),
  disabled_reason  = 'Parser not yet firing â 0 rows ingested. Needs source recon and parser build before enabling.'
WHERE parser_key IN ('gsa', 'infrastructure_ontario_surplus', 'city_hamilton_surplus');

