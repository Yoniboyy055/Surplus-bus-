-- -----------------------------------------------------------------------------
-- MIGRATION: 021_sources_seed_city_batch2.sql
-- PURPOSE: Seed Ottawa, Calgary, Edmonton city surplus sources
-- -----------------------------------------------------------------------------

INSERT INTO public.sources (
  name,
  parser_key,
  kind,
  jurisdiction,
  base_url,
  feed_url,
  is_active,
  priority,
  fetch_interval_minutes
)
VALUES
  (
    'City of Ottawa Surplus',
    'city_ottawa_surplus',
    'surplus',
    'CA-ON',
    'https://ottawa.ca',
    'https://ottawa.ca/en/business-and-growth',
    true,
    55,
    1440
  ),
  (
    'City of Calgary Surplus',
    'city_calgary_surplus',
    'surplus',
    'CA-AB',
    'https://calgary.ca',
    'https://calgary.ca/buy-sell.html',
    true,
    54,
    1440
  ),
  (
    'City of Edmonton Surplus',
    'city_edmonton_surplus',
    'surplus',
    'CA-AB',
    'https://www.edmonton.ca',
    'https://www.edmonton.ca/business_economy/vehicle-and-equipment-sales',
    true,
    53,
    1440
  )
ON CONFLICT (parser_key) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  jurisdiction = EXCLUDED.jurisdiction,
  base_url = EXCLUDED.base_url,
  feed_url = EXCLUDED.feed_url,
  is_active = EXCLUDED.is_active,
  priority = EXCLUDED.priority,
  fetch_interval_minutes = EXCLUDED.fetch_interval_minutes,
  updated_at = now();
