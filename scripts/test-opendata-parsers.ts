/**
 * Unit tests for open-data parsers using in-repo fixtures (real samples).
 * Run: npm run test:opendata
 */
import { readFileSync } from "fs";
import path from "path";
import { parseGcSurplusSoldCsv } from "../lib/opendata/gcsurplusSold";
import { parseCanadaBuysOpenTendersCsv } from "../lib/opendata/canadabuys";
import { parseNsPublicTenderCsv, parseNsRealPropertyCsv } from "../lib/opendata/nsSurplus";
import { scoreOpportunityV2 } from "../lib/intelligence/scoring";
import { ingestOpenDataFeeds, gcSurplusRowCap } from "../lib/opendata/ingest";
import { extractFirstCsvFromZip } from "../lib/opendata/zip";
import { zipSync, strToU8 } from "fflate";

const root = path.join(process.cwd(), "fixtures", "open-data");

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function load(name: string) {
  return readFileSync(path.join(root, name), "utf8");
}

async function main() {
  let failed = 0;
  const test = async (name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      console.log(`OK  ${name}`);
    } catch (e) {
      failed++;
      console.error(`FAIL ${name}:`, e instanceof Error ? e.message : e);
    }
  };

  await test("GCSurplus sold fixture parses; sold excluded from ranking", () => {
    const rows = parseGcSurplusSoldCsv(load("gcsurplus_sold_sample.csv"));
    assert(rows.length >= 5, `expected >=5 rows, got ${rows.length}`);
    assert(rows.every((r) => r.status === "sold"), "all sold");
    assert(rows.every((r) => r.licence_id === "ogl-canada"), "licence");
    assert(rows.some((r) => r.sold_amount != null && r.sold_amount > 0), "has sold amounts");
    const first = rows[0];
    assert(first, "first row");
    const scored = scoreOpportunityV2({
      id: first.external_id,
      category: first.category,
      province: first.province,
      estimated_value: first.sold_amount,
      closing_date: first.closing_date,
      source_url: first.source_url,
      status: first.status,
    });
    assert(scored.excluded === true, "sold excluded from ranking");
  });

  await test("CanadaBuys open tenders parse + score open rows", () => {
    const rows = parseCanadaBuysOpenTendersCsv(load("canadabuys_open_tenders_sample.csv"));
    assert(rows.length >= 3, `expected >=3, got ${rows.length}`);
    const open = rows.filter((r) => r.status === "open");
    assert(open.length >= 1, "at least one open");
    assert(open.every((r) => r.source_url.startsWith("http")), "urls");
    const firstOpen = open[0];
    assert(firstOpen, "first open");
    const scored = scoreOpportunityV2({
      id: firstOpen.external_id,
      category: firstOpen.category,
      province: firstOpen.province,
      estimated_value: null,
      closing_date: firstOpen.closing_date,
      source_url: firstOpen.source_url,
      first_seen_at: firstOpen.publication_date,
      status: firstOpen.status,
    });
    assert(!scored.excluded, "open not excluded");
    assert(scored.score >= 0 && scored.score <= 100, "score range");
    assert(scored.parts.length === 5, "five parts");
  });

  await test("NS tender + real property fixtures", () => {
    const t = parseNsPublicTenderCsv(load("ns_surplus_tender_sample.csv"));
    const r = parseNsRealPropertyCsv(load("ns_surplus_real_property_sample.csv"));
    assert(t.length >= 3, "tender rows");
    assert(r.length >= 3, "real rows");
    assert(t.every((x) => x.licence_id === "ogl-nova-scotia"), "ns licence");
    assert(r.every((x) => x.kind === "real_property"), "kind");
  });

  await test("NS rows never carry awardee / payer fields (personal data)", () => {
    const t = parseNsPublicTenderCsv(load("ns_surplus_tender_sample.csv"));
    const r = parseNsRealPropertyCsv(load("ns_surplus_real_property_sample.csv"));
    for (const row of [...t, ...r]) {
      const keys = Object.keys(row);
      assert(!keys.includes("awarded_to"), "awarded_to must not exist");
      assert(!keys.includes("paid_party"), "paid_party must not exist");
      assert(!JSON.stringify(row).includes("[REDACTED]"), "no source personal column leaks");
    }
    // Synthetic row with a person's name in the personal columns: must not appear anywhere.
    const csv =
      "Fiscal Year,File #,Location,Description,Successful Contractor,Paid By,Contract Price\n" +
      "2020-2021,X1,SYDNEY,Sale & Removal,\"Jane Testperson, 1 Main St, Sydney, NS\",Jane Testperson,100.00\n";
    const [one] = parseNsPublicTenderCsv(csv);
    assert(one, "parsed synthetic row");
    assert(!JSON.stringify(one).includes("Testperson"), "name dropped at parse time");
  });

  await test("NS external_ids are unique within fixtures", () => {
    const all = [
      ...parseNsPublicTenderCsv(load("ns_surplus_tender_sample.csv")),
      ...parseNsRealPropertyCsv(load("ns_surplus_real_property_sample.csv")),
    ];
    const ids = new Set(all.map((x) => x.external_id));
    assert(ids.size === all.length, `duplicate ids: ${all.length - ids.size}`);
  });

  await test("ZIP extraction is pure JS (fflate) and returns the CSV", () => {
    const csv = load("gcsurplus_sold_sample.csv");
    const zip = zipSync({
      "readme.txt": strToU8("not a csv"),
      "gcsurplus-sample-eng.csv": strToU8("\ufeff" + csv),
    });
    const out = extractFirstCsvFromZip(zip);
    assert(out.name === "gcsurplus-sample-eng.csv", `picked ${out.name}`);
    assert(out.text === csv, "BOM stripped and content intact");
    assert(parseGcSurplusSoldCsv(out.text).length >= 5, "parses after unzip");
    let threw = false;
    try {
      extractFirstCsvFromZip(zipSync({ "a.txt": strToU8("x") }));
    } catch {
      threw = true;
    }
    assert(threw, "throws when ZIP has no CSV");
  });

  await test("ingest source has no OS unzip / child_process", () => {
    const src = readFileSync(path.join(process.cwd(), "lib", "opendata", "ingest.ts"), "utf8");
    assert(!src.includes("child_process"), "no child_process");
    assert(!/execFile|\"unzip\"/.test(src), "no unzip shell-out");
    assert(!src.includes("slice(0, 5000)"), "no silent 5000 cap");
  });

  await test("GCSurplus row cap is explicit, opt-in and reported", async () => {
    const prev = process.env.OPENDATA_GCSURPLUS_MAX_ROWS;
    try {
      delete process.env.OPENDATA_GCSURPLUS_MAX_ROWS;
      assert(gcSurplusRowCap() === null, "no cap by default");
      const all = parseGcSurplusSoldCsv(load("gcsurplus_sold_sample.csv")).length;
      const [noCap] = await ingestOpenDataFeeds({
        dryRun: true,
        feeds: ["gcsurplus_sold"],
        fixtures: { gcsurplusSoldCsv: load("gcsurplus_sold_sample.csv") },
      });
      assert(noCap && noCap.rows_parsed === all && noCap.row_cap === undefined, "uncapped");
      process.env.OPENDATA_GCSURPLUS_MAX_ROWS = "2";
      const [capped] = await ingestOpenDataFeeds({
        dryRun: true,
        feeds: ["gcsurplus_sold"],
        fixtures: { gcsurplusSoldCsv: load("gcsurplus_sold_sample.csv") },
      });
      assert(capped && capped.row_cap === 2, "cap reported");
      assert(capped.rows_dropped_by_cap === all - 2, "dropped count reported");
      process.env.OPENDATA_GCSURPLUS_MAX_ROWS = "abc";
      assert(gcSurplusRowCap() === null, "invalid cap ignored");
    } finally {
      if (prev === undefined) delete process.env.OPENDATA_GCSURPLUS_MAX_ROWS;
      else process.env.OPENDATA_GCSURPLUS_MAX_ROWS = prev;
    }
  });

  await test("ingest dry-run with fixtures (no service role)", async () => {
    const results = await ingestOpenDataFeeds({
      dryRun: true,
      fixtures: {
        gcsurplusSoldCsv: load("gcsurplus_sold_sample.csv"),
        canadabuysCsv: load("canadabuys_open_tenders_sample.csv"),
        nsTenderCsv: load("ns_surplus_tender_sample.csv"),
        nsRealCsv: load("ns_surplus_real_property_sample.csv"),
      },
    });
    assert(results.length === 3, "three feeds");
    assert(results.every((r) => r.rows_parsed > 0), "parsed");
    assert(results.every((r) => r.status === "skipped"), "skipped without service role");
  });

  if (failed) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log("\nAll open-data parser tests passed");
}

main();
