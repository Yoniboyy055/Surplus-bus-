
-- ============================================================
-- Migration 048: Phase D Calgary â FAIL
-- Critical finding: City of Calgary no longer manages surplus directly.
-- All surplus (vehicles, equipment, furniture, police seizures, lost+found)
-- is contracted exclusively to Michener Allen Auctioneering Ltd. (maauctions.com).
-- This means:
--   1. calgary.ca/buy-sell is a discovery/referral page only â no listings
--   2. real_host_url must be corrected to maauctions.com
--   3. vendor_family must be corrected from 'Calgary Direct (City)' to 'Michener Allen'
--   4. City of Calgary and City of Edmonton now share the same vendor family
--   5. Gate 1 (real_listings_found) FAILS for the current parser target
-- ============================================================

-- Gate evaluation:
-- Gate 1 real_listings_found:  FAIL â calgary.ca/buy-sell has NO listings
--                                      page explicitly redirects to maauctions.com
--                                      The City of Calgary no longer sells surplus directly
-- Gate 2 stable_external_id:   UNKNOWN â cannot evaluate, Gate 1 failed
-- Gate 3 core_fields_present:  UNKNOWN
-- Gate 4 dedup_verified:       UNKNOWN
-- Gate 5 terminal_state_plan:  UNKNOWN
-- RESULT: FAIL â parser is pointed at wrong URL. Requires redirect to maauctions.com

INSERT INTO source_qualification_log (
  source_id,
  checked_by,
  real_listings_found,
  stable_external_id,
  core_fields_present,
  dedup_verified,
  terminal_state_plan,
  consecutive_runs_ok,
  gate_passed,
  real_host_discovered,
  notes
)
SELECT
  id,
  'surplus_bus_phase_d_manual',
  false,  -- Gate 1 FAIL â calgary.ca/buy-sell has zero listings
  false,
  false,
  false,
  false,
  0,
  false,  -- ALL GATES BLOCKED â Gate 1 hard fail
  'https://www.maauctions.com/',
  'Phase D FAIL. Critical finding: City of Calgary closed its direct surplus store. '
  'All surplus (vehicles, equipment, furniture, police seizures, unclaimed lost/found) '
  'is now contracted exclusively to Michener Allen Auctioneering Ltd. at maauctions.com. '
  'Source page calgary.ca/buy-sell/buy-from-city/surplus-auctions.html explicitly states: '
  '"The City of Calgary no longer sells surplus items through its online surplus store." '
  'and links directly to maauctions.com. '
  'Current parser target calgary.ca/buy-sell returns nav/referral page only â zero listings. '
  'Required actions: '
  '1. Correct real_host_url to https://www.maauctions.com '
  '2. Re-assign vendor_family_id to Michener Allen family '
  '3. Update Calgary Direct (City) family â mark as deprecated '
  '4. Calgary + Edmonton now share Michener Allen vendor family '
  '5. Re-run Phase D against maauctions.com after parser is redirected.'
FROM sources
WHERE parser_key = 'city_calgary_surplus';

-- ââ Correct Calgary source record âââââââââââââââââââââââââ
UPDATE sources
SET real_host_url  = 'https://www.maauctions.com/',
    phase_current  = 'B_consolidate',  -- step back â vendor needs re-identification
    updated_at     = now()
WHERE parser_key = 'city_calgary_surplus';

-- ââ Reassign Calgary to Michener Allen vendor family ââââââ
UPDATE sources
SET vendor_family_id = (
  SELECT id FROM vendor_families WHERE family_name = 'Michener Allen'
)
WHERE parser_key = 'city_calgary_surplus';

-- ââ Deprecate Calgary Direct (City) family ââââââââââââââââ
UPDATE vendor_families
SET phase_c_selected = false,
    structure_notes = structure_notes || 
      ' â DEPRECATED 2026-03-15: City of Calgary no longer manages surplus directly. '
      'All items contracted to Michener Allen (maauctions.com). This family is invalid.'
WHERE family_name = 'Calgary Direct (City)';

-- ââ Update Michener Allen family notes to reflect dual coverage ââ
UPDATE vendor_families
SET structure_notes = 
  'Western Canadian auction company. Contracted by City of Edmonton AND City of Calgary '
  'for all municipal surplus. Also serves other municipalities and industrial clients. '
  'Calgary contracted as of at least 2025 â city closed its direct surplus store. '
  'Edmonton contracted for all surplus vehicles, equipment, tools, furniture, lost+found. '
  'Listings at maauctions.com. Categories: vehicles, heavy equipment, tools, furniture, '
  'police seizures, court seizures, unclaimed property, industrial. '
  'No documented public API. Parser approach: HTML scraping of active auction pages. '
  'Login required to bid, not to browse.'
WHERE family_name = 'Michener Allen';

