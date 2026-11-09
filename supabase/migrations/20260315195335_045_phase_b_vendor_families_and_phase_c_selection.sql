
-- ============================================================
-- Migration 045: Seed vendor_families + run Phase C selection
-- Phase C decision per family:
--   SELECTED   = direct ingest viable, parser buildable
--   NOT SELECTED = Lane C (commercial marketplace) â link-out only
--   DEFERRED   = possible future ingest, needs more investigation
-- ============================================================

-- ââ Step 1: Seed vendor_families

INSERT INTO vendor_families (
  family_name, platform_url, login_required,
  lot_id_pattern, structure_notes, priority, phase_c_selected
) VALUES

-- GovDeals: Commercial marketplace. Lane C. Ottawa + Ontario Surplus.
-- Rule: must never be ingested. Link-out only.
(
  'GovDeals',
  'https://www.govdeals.ca',
  false,
  'Lot-NNNN-NNN',
  'Commercial US-based marketplace (Liquidity Services). Canadian subdomain govdeals.ca. '
  'Used by City of Ottawa and Province of Ontario. Lane C â commercial marketplace. '
  'No direct ingest permitted. Link-out strategy only. '
  'Lot IDs follow pattern: seller-id + lot-number (e.g. 6620-491). '
  'Listings accessible without login. No public API documented.',
  10,
  false  -- NOT SELECTED â Lane C
),

-- GCSurplus: Federal Crown proprietary platform (PSPC).
-- Self-hosted. Blocks automated HEAD requests. Needs cookie-aware fetch.
-- Open data sold comps available separately on open.canada.ca.
(
  'GCSurplus (PSPC)',
  'https://gcsurplus.ca',
  false,
  'SaleID-LotID',
  'Federal Crown proprietary platform operated by PSPC. '
  'Public listings accessible but blocks automated HEAD/GET without session. '
  'Parser must use browser-like fetch with Accept headers and follow JS redirects. '
  'Open data sold comps CSV at open.canada.ca (dataset 1a09c5c1) â updated semi-annually. '
  'Listing structure: sale pages with individual lot sub-pages. '
  'Feed URL: /mn-eng.cfm?snc=wfsav&vndsld=0. No formal public API.',
  90,
  true  -- SELECTED â federal proprietary, high volume, direct ingest viable
),

-- CanadaBuys (PSPC): Federal procurement notices. Machine-readable CSV available daily.
(
  'CanadaBuys (PSPC)',
  'https://canadabuys.canada.ca',
  false,
  'reference-number',
  'Federal procurement platform (PSPC). Replaced buyandsell.gc.ca April 2023. '
  'Daily open data CSV feed: canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv. '
  'New tenders CSV also available. Machine-readable. No auth required. '
  'Record type: tender notices (RFP, ACAN, standing offers). '
  'Not a surplus/auction platform â procurement intelligence only. '
  'Parser should consume CSV feed directly, not scrape HTML.',
  95,
  true  -- SELECTED â open data feed, most reliable source in registry
),

-- Alberta Government Surplus: Provincial proprietary platform.
(
  'Alberta Government Surplus',
  'https://surplus.gov.ab.ca',
  false,
  'Item-NNNNN',
  'Provincial surplus auction platform operated by Alberta Government Services. '
  'Public listings accessible without login. Bid registration required to place bids. '
  'Items include vehicles, equipment, furniture, electronics from AB ministries and agencies. '
  'Structured HTML listing pages. No documented public API. '
  'Parser approach: HTML scraping of active listings index page.',
  85,
  true  -- SELECTED â provincial proprietary, direct ingest viable
),

-- North Toronto Auction: Municipal auctioneer contracted by City of Toronto.
(
  'North Toronto Auction',
  'https://www.northtorontoauction.com',
  false,
  'Lot-NNN',
  'Private auctioneer contracted by City of Toronto for surplus fleet vehicles and equipment. '
  'Physical auctions in Innisfil ON, last Saturday each month. '
  'Online webcast bidding available. Run list posted ~1 week prior to auction. '
  'Contractor: Platinum Liquidations. No public API. '
  'Parser approach: scrape run list page when live. '
  'Seasonal â no listings between auctions. Availability window: ~7 days per month.',
  60,
  true  -- SELECTED â real vehicle auction data, worth capturing
),

-- Michener Allen: Private auctioneer contracted by City of Edmonton.
(
  'Michener Allen',
  'https://www.michenerallen.com',
  false,
  'Lot-NNNNN',
  'Western Canadian auction company contracted by City of Edmonton for all surplus. '
  'Also serves other municipalities and industrial clients across Western Canada. '
  'Categories: vehicles, heavy equipment, tools, furniture, lost/found items. '
  'Listings accessible without login. Bid registration required for participation. '
  'No documented public API. Parser approach: HTML scraping of active auction pages.',
  70,
  true  -- SELECTED â direct ingest viable, broad western Canada coverage
),

-- Calgary Direct: City of Calgary manages surplus directly via calgary.ca.
(
  'Calgary Direct (City)',
  'https://www.calgary.ca/buy-sell.html',
  false,
  null,
  'City of Calgary manages surplus asset listings directly on calgary.ca. '
  'No third-party auctioneer identified â listings appear to be direct city postings. '
  'Categories: vehicles, equipment, city property. '
  'Structure: HTML listing pages on city website. No documented API. '
  'Parser approach: scrape city listing pages directly.',
  75,
  true  -- SELECTED â direct city-managed listings
)

ON CONFLICT (family_name) DO UPDATE SET
  platform_url   = EXCLUDED.platform_url,
  structure_notes = EXCLUDED.structure_notes,
  priority       = EXCLUDED.priority,
  phase_c_selected = EXCLUDED.phase_c_selected;


-- ââ Step 2: Link sources to vendor families

UPDATE sources SET vendor_family_id = (
  SELECT id FROM vendor_families WHERE family_name = 'GovDeals'
) WHERE parser_key IN ('city_ottawa_surplus', 'on_surplus');

UPDATE sources SET vendor_family_id = (
  SELECT id FROM vendor_families WHERE family_name = 'GCSurplus (PSPC)'
) WHERE parser_key = 'gc_buyandsell';

UPDATE sources SET vendor_family_id = (
  SELECT id FROM vendor_families WHERE family_name = 'CanadaBuys (PSPC)'
) WHERE parser_key = 'canadabuys';

UPDATE sources SET vendor_family_id = (
  SELECT id FROM vendor_families WHERE family_name = 'Alberta Government Surplus'
) WHERE parser_key = 'ab_surplus';

UPDATE sources SET vendor_family_id = (
  SELECT id FROM vendor_families WHERE family_name = 'North Toronto Auction'
) WHERE parser_key = 'city_toronto_surplus';

UPDATE sources SET vendor_family_id = (
  SELECT id FROM vendor_families WHERE family_name = 'Michener Allen'
) WHERE parser_key = 'city_edmonton_surplus';

UPDATE sources SET vendor_family_id = (
  SELECT id FROM vendor_families WHERE family_name = 'Calgary Direct (City)'
) WHERE parser_key = 'city_calgary_surplus';


-- ââ Step 3: Phase C â advance selected sources, reclassify Lane C sources

-- Advance SELECTED families to C_select phase
UPDATE sources
SET phase_current = 'C_select',
    updated_at = now()
WHERE vendor_family_id IN (
  SELECT id FROM vendor_families WHERE phase_c_selected = true
)
AND phase_current = 'B_consolidate';

-- Lane C sources: reclassify source_role to 'discovery', keep at B_consolidate
-- These are link-out only â they do not advance to C_select
UPDATE sources
SET source_role = 'discovery',
    disabled_reason = 'Lane C â commercial marketplace (GovDeals). Link-out only per architecture rules.',
    updated_at = now()
WHERE vendor_family_id IN (
  SELECT id FROM vendor_families WHERE phase_c_selected = false
)
AND phase_current = 'B_consolidate';


-- ââ Step 4: Log Phase B and Phase C entries in source_recon_log for all sources

-- Phase B log entries for the 3 auto-passed sources (Alberta, CanadaBuys, Calgary)
-- that didn't get vendor_family set during manual update
INSERT INTO source_recon_log (source_id, phase, sandbox_mode, discovered_host_url, vendor_family, outcome, notes)
SELECT 
  s.id,
  'B_consolidate',
  true,
  s.real_host_url,
  vf.family_name,
  'pass',
  'Phase B complete. Vendor family identified: ' || vf.family_name || '. Real host confirmed.'
FROM sources s
JOIN vendor_families vf ON vf.id = s.vendor_family_id
WHERE s.parser_key IN ('ab_surplus', 'canadabuys', 'city_calgary_surplus');

-- Phase C log entries for all selected sources
INSERT INTO source_recon_log (source_id, phase, sandbox_mode, discovered_host_url, vendor_family, outcome, notes)
SELECT
  s.id,
  'C_select',
  true,
  s.real_host_url,
  vf.family_name,
  'pass',
  'Phase C selected. Vendor family: ' || vf.family_name || 
  '. Parser build viable. Advancing to D_qualify.'
FROM sources s
JOIN vendor_families vf ON vf.id = s.vendor_family_id
WHERE vf.phase_c_selected = true
  AND s.phase_current = 'C_select';

-- Phase C log for Lane C sources (not selected)
INSERT INTO source_recon_log (source_id, phase, sandbox_mode, discovered_host_url, vendor_family, outcome, notes)
SELECT
  s.id,
  'C_select',
  true,
  s.real_host_url,
  vf.family_name,
  'skip',
  'Phase C: NOT SELECTED. Lane C commercial marketplace â GovDeals. '
  'Link-out only per architecture rules. source_role set to discovery.'
FROM sources s
JOIN vendor_families vf ON vf.id = s.vendor_family_id
WHERE vf.phase_c_selected = false;

