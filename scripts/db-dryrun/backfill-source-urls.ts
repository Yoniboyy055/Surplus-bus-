/**
 * DRY-RUN ONLY. Recomputes source_url for price_history_lots and tender_notices
 * using lib/opendata/sourceLinks (period resource / CanadaBuys notice / NS filter).
 * Does not connect to live Supabase. Prints SQL that an operator could apply after
 * Yonatan approves a push + migrate/reingest. Prefer re-ingest over UPDATE when possible.
 *
 *   npx tsx scripts/db-dryrun/backfill-source-urls.ts
 */
import { gcsurplusSoldResourcePageUrl, canadabuysNoticePageUrl, nsFilteredDataUrl } from "../../lib/opendata/urls";

console.log(`-- DRY RUN: sample UPDATE statements (do not run against live without approval)
-- GCSurplus: set source_url from closing_date → half-year resource page
UPDATE public.price_history_lots
SET source_url = CASE
${[
  ["2025-07-01", "2025-12-31", "b5e1082e-73ec-4cc4-a585-0d877aff005e"],
  ["2025-01-01", "2025-06-30", "f8d7daf0-40a0-457e-afe9-be791ab9fa3d"],
  ["2024-07-01", "2024-12-31", "979518b1-583f-4b19-bc5d-0a57742c13f6"],
  ["2024-01-01", "2024-06-30", "cfe612bb-41f1-4b90-836f-09a71e5419a4"],
]
  .map(
    ([a, b, id]) =>
      `  WHEN feed_key = 'gcsurplus_sold' AND closing_date >= '${a}' AND closing_date <= '${b}' THEN 'https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4/resource/${id}'`
  )
  .join("\n")}
  ELSE source_url
END
WHERE feed_key = 'gcsurplus_sold';

-- CanadaBuys: prefer notice page from reference_number (never MERX)
UPDATE public.tender_notices
SET source_url = 'https://canadabuys.canada.ca/en/tender-opportunities/tender-notice/' || lower(reference_number)
WHERE feed_key = 'canadabuys' AND reference_number IS NOT NULL AND reference_number <> '';

-- NS: filter the dataset data view by file_number
UPDATE public.price_history_lots
SET source_url = CASE
  WHEN category = 'real_property' OR kind = 'real_property'
    THEN 'https://data.novascotia.ca/Internal-Government-Services/Surplus-Crown-Property-Disposal-Real-Property/2kw3-tjdw/data?q=' || replace(file_number, ' ', '%20')
  ELSE 'https://data.novascotia.ca/Internal-Government-Services/Surplus-Crown-Property-Purchase-and-Removal-Public/f89b-7ujj/data?q=' || replace(file_number, ' ', '%20')
END
WHERE feed_key = 'ns_surplus' AND file_number IS NOT NULL AND file_number <> '';
`);

console.log("\n-- Helper check (local):");
console.log("GCS H1", gcsurplusSoldResourcePageUrl("2025-03-05"));
console.log("CB", canadabuysNoticePageUrl("MX-443841357513"));
console.log("NS", nsFilteredDataUrl("public_tender", "AGR09-001"));
