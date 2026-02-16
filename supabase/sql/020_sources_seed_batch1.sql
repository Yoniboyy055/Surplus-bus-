-- -----------------------------------------------------------------------------
-- MIGRATION: 020_sources_seed_batch1.sql
-- PURPOSE: Seed Batch-1 surplus sources (Alberta, Ontario, Toronto)
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
    'Alberta Surplus',
    'ab_surplus',
    'surplus',
    'CA-AB',
    'https://surplus.gov.ab.ca',
    NULL,
    true,
    80,
    1440
  ),
  (
    'Ontario Surplus',
    'on_surplus',
    'surplus',
    'CA-ON',
    'https://www.ontario.ca',
    'https://www.ontario.ca/page/surplus-government-property',
    true,
    70,
    1440
  ),
  (
    'City of Toronto Surplus',
    'city_toronto_surplus',
    'surplus',
    'CA-ON-TOR',
    'https://www.toronto.ca',
    'https://www.toronto.ca/services-payments/streets-parking-transportation/transportation-services/surplus-vehicles-equipment/',
    true,
    60,
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
