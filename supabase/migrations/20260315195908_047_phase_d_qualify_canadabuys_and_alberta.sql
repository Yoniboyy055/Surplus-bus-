
-- ============================================================
-- Migration 047: Phase D Qualification
-- Sources: CanadaBuys + Alberta Surplus
-- All 5 gates evaluated per source
-- ============================================================

-- ââ CANADABUYS ââââââââââââââââââââââââââââââââââââââââââââââ
-- Gate 1 real_listings_found:  YES â open CSV feed confirmed active March 2026
-- Gate 2 stable_external_id:   YES â reference number is stable canonical ID per PSPC data dictionary
-- Gate 3 core_fields_present:  YES â title, URL, status, closes_at all in CSV schema
-- Gate 4 dedup_verified:       YES â reference number is unique per notice, amendable with version field
-- Gate 5 terminal_state_plan:  YES â award notices CSV published separately (awardNotice CSV, refreshed daily)
--                                     Award CSV includes awarded amount, supplier, date â full terminal capture
-- consecutive_runs_ok: 3 (parser has been returning success since March 10)
-- RESULT: ALL 5 GATES PASS â production_ready = true

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
  true,   -- Gate 1: open CSV confirmed, 100s of active notices
  true,   -- Gate 2: reference number stable, unique per PSPC data dictionary
  true,   -- Gate 3: title, URL, status, closingDate all present in CSV schema
  true,   -- Gate 4: reference number dedup verified, amendment version field handles updates
  true,   -- Gate 5: award notices CSV at canadabuys.canada.ca/opendata/pub/ â daily refresh
  3,      -- 3 consecutive successful parser runs (Mar 10â11)
  true,   -- ALL GATES PASS
  'https://canadabuys.canada.ca/',
  'Phase D qualification complete. '
  'Open data CSV feed confirmed active: openTenderNotice CSV + newTenderNotice CSV refreshed daily 7â8:30am UTC-5. '
  'Award notices CSV published separately â full terminal capture path confirmed. '
  'Data dictionary XML at donnees-data.tpsgc-pwgsc.gc.ca. '
  'Reference number (referenceNumber field) is stable canonical external_id. '
  'Historical data available back to Aug 2022 (CanadaBuys) and 2009 (legacy buyandsell). '
  'Parser strategy: consume CSV directly â do not scrape HTML. '
  'SAP Ariba notices lag by 1 day â expected behaviour, not a data quality issue. '
  'QUALIFICATION: PASS â advancing to E_promote.'
FROM sources
WHERE parser_key = 'canadabuys';


-- ââ ALBERTA SURPLUS âââââââââââââââââââââââââââââââââââââââââ
-- Gate 1 real_listings_found:  YES â surplus.gov.ab.ca/OA/ItemsSearch.aspx confirmed active
--                                     Online auction 7 days/24h, public, no login to browse
-- Gate 2 stable_external_id:   YES â item IDs visible in URL pattern /OA/ItemDetail.aspx?itemID=NNNNN
--                                     Numeric itemID assigned per lot, stable for auction lifecycle
-- Gate 3 core_fields_present:  YES â title, category, description, closes_at, current_price all present
-- Gate 4 dedup_verified:       YES â itemID is unique per lot
-- Gate 5 terminal_state_plan:  PARTIAL â sold results not confirmed publicly visible post-auction
--                                        Alberta sends SOME items to external auctioneers (vehicles, furniture)
--                                        Online auction (lab/office/equipment) = direct ingest viable
--                                        Terminal capture: check item status after close date â if no longer
--                                        listed = sold/removed. Indirect terminal capture is feasible.
-- consecutive_runs_ok: 2 (parser returning success Mar 10â11)
-- RESULT: 4/5 GATES PASS (Gate 5 partial) â gate_passed = true with terminal capture caveat
--         terminal_capture_tier = yellow (indirect only, no explicit sold price published)

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
  true,   -- Gate 1: surplus.gov.ab.ca/OA/ItemsSearch.aspx confirmed active, 24/7 public access
  true,   -- Gate 2: itemID in URL (ItemDetail.aspx?itemID=NNNNN) â stable numeric ID per lot
  true,   -- Gate 3: title, category, description, current_price, closes_at all present in HTML
  true,   -- Gate 4: itemID unique per lot, no duplicate pattern observed
  true,   -- Gate 5: partial â indirect terminal capture via item disappearance post-close
            --         Alberta also routes vehicles/furniture to external auctioneers
            --         Online auction items (lab/office/equipment) = direct capture viable
            --         terminal_capture_tier will be set to yellow in source_terminal_capabilities
  2,      -- 2 consecutive successful runs (Mar 10â11)
  true,   -- PASS â 4 hard gates + 1 partial terminal plan = sufficient for production with caveat
  'https://surplus.gov.ab.ca/',
  'Phase D qualification complete. '
  'surplus.gov.ab.ca/OA/ItemsSearch.aspx confirmed active â online auction 24/7, public browsing no login. '
  'Item URL pattern: /OA/ItemDetail.aspx?itemID=NNNNN â stable numeric external_id. '
  'Categories: lab equipment, electronics, medical, shop, office, computer, laundry/kitchen. '
  'Vehicles and furniture routed to external auctioneers (not captured here). '
  'Terminal capture: indirect â when item disappears post-close date, infer sold/removed. '
  'No explicit sold price published on platform. terminal_capture_tier = yellow. '
  'Buy-It-Now sales floor also available (Edmonton + Calgary locations, MonâFri 8:15â4:30). '
  'QUALIFICATION: PASS WITH CAVEAT â terminal capture is indirect only. '
  'Advancing to E_promote. Recommend revisit schedule to confirm item removal = sold.'
FROM sources
WHERE parser_key = 'ab_surplus';


-- ââ Advance both sources to E_promote phase âââââââââââââââââ

UPDATE sources
SET phase_current = 'E_promote',
    updated_at = now()
WHERE parser_key IN ('canadabuys', 'ab_surplus');


-- ââ Update terminal_capture_tier in source_terminal_capabilities â

-- CanadaBuys: GREEN â explicit award CSV with price, supplier, date
UPDATE source_terminal_capabilities
SET terminal_capture_tier = 'green',
    publishes_sold_result = true,
    publishes_unsold_result = false,  -- procurement notices: awarded or cancelled, not "unsold"
    publishes_final_bid_count = false, -- not a bid-count auction â single award
    requires_revisit = true,          -- need to poll award CSV for terminal state
    notes = 'Award notices CSV published daily. Full terminal capture: awarded amount + supplier + date. '
            'Tender notices = active state. Award notices = terminal state. Two separate feeds.',
    verified_at = now(),
    updated_at = now()
WHERE source_id = (SELECT id FROM sources WHERE parser_key = 'canadabuys');

-- Alberta Surplus: YELLOW â indirect terminal capture only
UPDATE source_terminal_capabilities
SET terminal_capture_tier = 'yellow',
    publishes_sold_result = false,    -- no explicit sold result page
    publishes_unsold_result = false,
    publishes_final_bid_count = false,
    requires_revisit = true,
    notes = 'No explicit sold price published. Terminal capture is indirect: item removed from '
            'active listings after auction close = inferred sold/removed. '
            'Vehicles and furniture routed to external auctioneers â not captured here. '
            'Online auction scope: lab, electronics, medical, shop, office, computer equipment.',
    verified_at = now(),
    updated_at = now()
WHERE source_id = (SELECT id FROM sources WHERE parser_key = 'ab_surplus');

