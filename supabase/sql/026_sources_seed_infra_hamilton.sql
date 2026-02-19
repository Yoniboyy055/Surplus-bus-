-- -----------------------------------------------------------------------------
-- MIGRATION: 026_sources_seed_infra_hamilton.sql
-- PURPOSE: Seed Infrastructure Ontario and City of Hamilton surplus sources
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
    'Infrastructure Ontario Surplus',
    'infrastructure_ontario_surplus',
    'surplus',
    'CA-ON',
    'https://www.infrastructureontario.ca',
    'https://www.infrastructureontario.ca/en/what-we-do/real-estate-services/ontario-government-surplus-properties/',
    true,
    65,
    1440
  ),
  (
    'City of Hamilton Surplus',
    'city_hamilton_surplus',
    'surplus',
    'CA-ON',
    'https://www.hamilton.ca',
    'https://www.hamilton.ca/build-invest-grow/buying-selling-city/bids-and-tenders/surplus-items-auction',
    true,
    52,
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
