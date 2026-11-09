
-- ============================================================
-- Migration: Extend source constraints + add open data sources
-- Date: 2026-03-15
-- Reason: Schema needs open_data kind, signal/price_reference role,
--         and new source records for expansion plan
-- ============================================================

-- Step 1: Extend sources.kind to include 'open_data'
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_kind_check;
ALTER TABLE sources ADD CONSTRAINT sources_kind_check 
  CHECK (kind = ANY (ARRAY['rfp', 'surplus', 'auction', 'open_data']));

-- Step 2: Extend sources.source_role to include 'signal'
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_source_role_check;
ALTER TABLE sources ADD CONSTRAINT sources_source_role_check 
  CHECK (source_role = ANY (ARRAY['transaction', 'price_reference', 'discovery', 'signal']));

-- Step 3: Fix Calgary real_host_url â Michener Allen
UPDATE sources
SET 
  real_host_url = 'https://www.maauctions.com',
  disabled_reason = 'Real host is maauctions.com (Michener Allen). City of Calgary closed direct surplus store. Parser must target maauctions.com â re-qualification required against real host.',
  quality_state = 'gray',
  phase_current = 'A_recon',
  updated_at = now()
WHERE parser_key = 'city_calgary_surplus';

-- Step 4: Fix Edmonton real_host_url â Michener Allen
UPDATE sources
SET
  real_host_url = 'https://www.maauctions.com',
  disabled_reason = 'Real host is maauctions.com (Michener Allen). Edmonton routes all surplus through this contractor. Lane C classification under review â Michener Allen is a private auctioneer, not a US commercial marketplace. Re-classification pending ToS review.',
  quality_state = 'gray',
  phase_current = 'A_recon',
  updated_at = now()
WHERE parser_key = 'city_edmonton_surplus';

-- Step 5: Add GCSurplus Open Data (Sold Comps CSV)
INSERT INTO sources (
  id, name, kind, jurisdiction,
  base_url, feed_url, parser_key,
  is_active, fetch_interval_minutes, priority,
  robots_policy, quality_state, source_role,
  production_ready, phase_current, real_host_url,
  disabled_reason, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'GCSurplus Sold Comps (Open Canada CSV)',
  'surplus', 'CA-FED',
  'https://open.canada.ca',
  'https://open.canada.ca/data/en/dataset/1a09c5c1-4468-44cf-9d5f-f5d0d66a46a2',
  'gc_surplus_open_data',
  false, 720, 2,
  'respect', 'gray', 'price_reference',
  false, 'A_recon', 'https://open.canada.ca',
  'New source. Open Government Licence â Canada. Semi-annual CSV of GCSurplus sold items with final prices. Zero scraping â direct CSV download. Value: terminal price calibration, asset valuation baseline. NOT a live listing feed â historical sold comps only.',
  now(), now()
);

-- Step 6: Add Ontario Tenders Portal
INSERT INTO sources (
  id, name, kind, jurisdiction,
  base_url, feed_url, parser_key,
  is_active, fetch_interval_minutes, priority,
  robots_policy, quality_state, source_role,
  production_ready, phase_current, real_host_url,
  disabled_reason, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Ontario Tenders Portal (Procurement)',
  'rfp', 'CA-ON',
  'https://ontariotenders.ca',
  'https://ontariotenders.ca/page/public-tenders',
  'ontario_tenders',
  false, 60, 3,
  'respect', 'gray', 'signal',
  false, 'A_recon', 'https://ontariotenders.ca',
  'New source. Provincial procurement notices. OGL-Ontario. Value: demand signal for equipment procurement cycles, pre-surplus detection. Verify feed structure and ToS before parser build.',
  now(), now()
);

-- Step 7: Add Toronto Open Data
INSERT INTO sources (
  id, name, kind, jurisdiction,
  base_url, feed_url, parser_key,
  is_active, fetch_interval_minutes, priority,
  robots_policy, quality_state, source_role,
  production_ready, phase_current, real_host_url,
  disabled_reason, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Toronto Open Data (Procurement & Assets)',
  'open_data', 'CA-ON-TOR',
  'https://open.toronto.ca',
  'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_search?q=procurement+surplus',
  'toronto_open_data',
  false, 1440, 4,
  'respect', 'gray', 'signal',
  false, 'A_recon', 'https://open.toronto.ca',
  'New source. Toronto Open Data Licence â royalty-free, commercial reuse with attribution. CKAN API available. Value: procurement signals, asset inventories, permit data. Identify specific datasets during recon.',
  now(), now()
);

-- Step 8: Seed source_terminal_capabilities for the 3 new sources
INSERT INTO source_terminal_capabilities (
  source_id,
  publishes_sold_result,
  publishes_unsold_result,
  publishes_final_bid_count,
  requires_revisit,
  terminal_capture_tier,
  notes,
  verified_at,
  updated_at
)
SELECT 
  id,
  CASE WHEN parser_key = 'gc_surplus_open_data' THEN true ELSE false END,
  false, false, false,
  CASE WHEN parser_key = 'gc_surplus_open_data' THEN 'green' ELSE 'red' END,
  CASE
    WHEN parser_key = 'gc_surplus_open_data' THEN 
      'Historical sold comps CSV â full terminal data (price, category, disposal date). Semi-annual. Not live.'
    WHEN parser_key = 'ontario_tenders' THEN 
      'Procurement notices â no terminal capture applicable. Signal feed only.'
    WHEN parser_key = 'toronto_open_data' THEN 
      'Open data portal. Terminal capture N/A at registration. Evaluate per dataset during recon.'
  END,
  now(), now()
FROM sources
WHERE parser_key IN ('gc_surplus_open_data', 'ontario_tenders', 'toronto_open_data');

