/**
 * Unit tests for open-data parsers using in-repo fixtures (real samples).
 * Run: npm run test:opendata
 */
import { readFileSync } from "fs";
import path from "path";
import { parseGcSurplusSoldCsv, collapseDoubledText } from "../lib/opendata/gcsurplusSold";
import { parseCanadaBuysOpenTendersCsv } from "../lib/opendata/canadabuys";
import { parseNsPublicTenderCsv, parseNsRealPropertyCsv } from "../lib/opendata/nsSurplus";
import { scoreOpportunityV2 } from "../lib/intelligence/scoring";
import { ingestOpenDataFeeds, gcSurplusRowCap, dedupeByExternalId } from "../lib/opendata/ingest";
import { extractFirstCsvFromZip } from "../lib/opendata/zip";
import { redactContactDetails } from "../lib/opendata/redact";
import { parseCsv } from "../lib/opendata/csv";
import { computeCompStats, toIlikePattern } from "../lib/opendata/comps";
import { computeFeedFreshness } from "../lib/opendata/freshness";
import { zipSync, strToU8 } from "fflate";
import { classifyNotice, startOfTodayToronto } from "../lib/opendata/tenderKind";
import { resolveLotSourceLink, resolveTenderSourceLink, gcsurplusSaleAccount } from "../lib/opendata/sourceLinks";
import { gcsurplusSoldResourcePageUrl, canadabuysNoticePageUrl, nsFilteredDataUrl } from "../lib/opendata/urls";

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

  await test("GCSurplus titles are not doubled (LOT_DESC repeats the title)", () => {
    const rows = parseGcSurplusSoldCsv(load("gcsurplus_sold_sample.csv"));
    for (const r of rows) {
      const t = r.title;
      const half = t.length / 2;
      assert(!(t.length % 2 === 0 && t.slice(0, half) === t.slice(half)), `doubled title: ${t}`);
    }
    assert(collapseDoubledText("Truck - RCMP EdsonTruck - RCMP Edson") === "Truck - RCMP Edson", "collapse");
    assert(collapseDoubledText("Boat Boat") === "Boat Boat", "short words untouched");
  });

  await test("GCSurplus identity: contract id is the stable external id; one sale = one comp", () => {
    const csv = load("gcsurplus_sold_sample.csv");
    const a = parseGcSurplusSoldCsv(csv);
    const b = parseGcSurplusSoldCsv(csv);
    assert(JSON.stringify(a.map((r) => r.external_id)) === JSON.stringify(b.map((r) => r.external_id)), "stable across parses");
    assert(new Set(a.map((r) => r.external_id)).size === a.length, "unique ids");
    assert(a.every((r) => r.external_id.startsWith("gcs-")), "contract-based ids");
    const mtl = a.filter((r) => r.external_id === "gcs-K5MO007200");
    assert(mtl.length === 1, `K5MO007200 (same sale at 2 locations) must be one comp, got ${mtl.length}`);
    assert((mtl[0]?.city || "").includes("Montreal") && (mtl[0]?.city || "").includes("Sainte-Catherine"), "locations merged");
    assert(a.length === 11, `12 CSV rows -> 11 comps, got ${a.length}`);
  });

  await test("GCSurplus identity: same contract, different amounts stay separate", () => {
    const tail = parseGcSurplusSoldCsv(["SOLD_AMT,LOT_DESC,LOT_ITEMS,CLOSING_DT","10,Printer,\"Quantity: 1(unit(s)) : - For further information, please contact Ali Belabbas at 514-496-6122 or at ali.belabbas@nrc-cnrc.gc.ca\",2025-08-01"].join("\n"));
    const tailOut = JSON.stringify(tail);
    assert(!/Belabbas|496-6122|nrc-cnrc/.test(tailOut), `LOT_ITEMS contact leaked: ${tailOut}`);
    const hdr = "SOLD_AMT,LOT_DESC,MIN_BID_AMT,CLOSING_DT,LOT_ITEMS,ASSET_LOC_CITY,ASSET_LOC_PROV,SALE_CNTRCT_REG_ID";
    const csv = [hdr, "100,Lot A,0,2025-01-01,x,Ottawa,ON,K1", "250,Lot B,0,2025-01-01,x,Ottawa,ON,K1"].join("\n");
    const rows = parseGcSurplusSoldCsv(csv);
    assert(rows.length === 2 && rows[0]!.external_id !== rows[1]!.external_id, "two lots");
  });

  await test("No personal/contact fields in any parsed open-data row", () => {
    const banned = /custodian|sales_person|sales_email|phone|phn|email|postal|awarded_to|paid_party|awardee|payer|contact/i;
    const all: Record<string, unknown>[] = [
      ...parseGcSurplusSoldCsv(load("gcsurplus_sold_sample.csv")),
      ...parseCanadaBuysOpenTendersCsv(load("canadabuys_open_tenders_sample.csv")),
      ...parseNsPublicTenderCsv(load("ns_surplus_tender_sample.csv")),
      ...parseNsRealPropertyCsv(load("ns_surplus_real_property_sample.csv")),
    ];
    for (const r of all) for (const k of Object.keys(r)) assert(!banned.test(k), `banned key ${k}`);
    const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const phoneRe = /\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/;
    for (const r of all) for (const v of Object.values(r)) {
      if (typeof v !== "string") continue;
      assert(!emailRe.test(v), `email in value: ${v.slice(0, 60)}`);
      assert(!phoneRe.test(v), `phone in value: ${v.slice(0, 60)}`);
    }
  });

  await test("redactContactDetails strips emails, phones and labelled names", () => {
    const out = redactContactDetails("Contracting Authority: Jane Q Public Email address: &nbsp;jane.public@tpsgc-pwgsc.gc.ca Telephone No. - (647) 273-1369 ext 22. Bid by Friday.")!;
    assert(!/@|273-1369|Jane/.test(out), `not redacted: ${out}`);
    assert(out.includes("Bid by Friday."), "keeps the rest");
  });

  await test("comp stats: ignore non-positive, band only at n>=20, percentiles", () => {
    assert(computeCompStats([]) === null, "empty -> null");
    assert(computeCompStats([0, -5, null, NaN]) === null, "invalid -> null");
    const few = computeCompStats([100, 200, 300])!;
    assert(few.n === 3 && few.median === 200 && few.showBand === false, "few");
    const many = computeCompStats(Array.from({ length: 21 }, (_, i) => (i + 1) * 100))!;
    assert(many.showBand && many.p25 === 600 && many.median === 1100 && many.p75 === 1600, JSON.stringify(many));
    assert(toIlikePattern("50% off (truck)*,") === "%50 off truck%", toIlikePattern("50% off (truck)*,"));
  });

  await test("freshness: never / fresh / stale / failing", () => {
    const now = new Date("2026-11-09T12:00:00Z");
    assert(computeFeedFreshness([], "canadabuys", now).state === "never", "never");
    const ok = [{ feed_key: "canadabuys", status: "ok", retrieved_at: "2026-11-09T06:00:00Z" }];
    assert(computeFeedFreshness(ok, "canadabuys", now).state === "fresh", "fresh");
    assert(computeFeedFreshness(ok, "canadabuys", new Date("2026-11-13T12:00:00Z")).state === "stale", "stale");
    const failing = [...ok, { feed_key: "canadabuys", status: "error", retrieved_at: "2026-11-09T10:00:00Z" }];
    assert(computeFeedFreshness(failing, "canadabuys", now).state === "failing", "failing");
  });

  await test("GCSurplus staff names/emails/phones in the raw file never reach parsed rows", () => {
    const raw = load("gcsurplus_sold_sample.csv");
    const { rows } = parseCsv(raw);
    const staffCols = ["CUSTODIAN_PERSON_NM", "CUSTODIAN_PERSON_PHN", "CUSTODIAN_EMAIL", "SALES_PERSON_NM", "SALES_EMAIL_ADDRS_ID", "SALES_PERSON_PHN"];
    for (const c of staffCols) assert(c in (rows[0] || {}), `fixture should contain ${c} (proves the test is meaningful)`);
    const secrets = new Set<string>();
    for (const r of rows) for (const c of staffCols) {
      const v = (r[c] || "").trim();
      if (v.length >= 5) secrets.add(v);
    }
    // Fixture contacts are pre-redacted, so also inject realistic synthetic staff data.
    const tail = parseGcSurplusSoldCsv(["SOLD_AMT,LOT_DESC,LOT_ITEMS,CLOSING_DT","10,Printer,\"Quantity: 1(unit(s)) : - For further information, please contact Ali Belabbas at 514-496-6122 or at ali.belabbas@nrc-cnrc.gc.ca\",2025-08-01"].join("\n"));
    const tailOut = JSON.stringify(tail);
    assert(!/Belabbas|496-6122|nrc-cnrc/.test(tailOut), `LOT_ITEMS contact leaked: ${tailOut}`);
    const hdr = "SOLD_AMT,LOT_DESC,MIN_BID_AMT,CLOSING_DT,LOT_ITEMS,LOT_CMNTS,ASSET_LOC_CITY,ASSET_LOC_PROV,CUSTODIAN_PERSON_NM,CUSTODIAN_PERSON_PHN,CUSTODIAN_EMAIL,SALES_PERSON_NM,SALES_EMAIL_ADDRS_ID,SALES_PERSON_PHN,SALE_CNTRCT_REG_ID";
    const synth = [hdr, '500,"Truck - contact Zelda Quintero at zelda.quintero@tpsgc-pwgsc.gc.ca or 613-555-0199",0,2025-08-01,x,"Custodian Contact: Zelda Quintero 613-555-0199",Ottawa,ON,Zelda Quintero,613-555-0199,zelda.quintero@tpsgc-pwgsc.gc.ca,Yuri Okonkwo,yuri.okonkwo@tpsgc-pwgsc.gc.ca,819-555-0123,K9ZZ000001'].join("\n");
    const synthOut = JSON.stringify(parseGcSurplusSoldCsv(synth));
    // "Zelda Quintero" sits in LOT_DESC as "contact Zelda Quintero at <email>": found by the e2e
    // mock's whole-DB scan (the name survived because the case-insensitive phrase captured "at").
    for (const v of ["Zelda Quintero", "zelda.quintero@tpsgc-pwgsc.gc.ca", "613-555-0199", "Yuri Okonkwo", "yuri.okonkwo", "819-555-0123"]) {
      assert(!synthOut.includes(v), `synthetic staff value leaked: ${v}`);
    }
    assert(synthOut.includes("Truck"), "lot kept");
    const out = JSON.stringify(parseGcSurplusSoldCsv(raw));
    for (const v of secrets) assert(!out.includes(v), `staff value leaked: ${v.slice(0, 4)}…`);
  });

  await test("CanadaBuys notice types: RFIs and ACANs are labelled, not shown as bids", () => {
    assert(classifyNotice("Request for Information").kind === "rfi", "rfi");
    assert(classifyNotice("Advance Contract Award Notice").kind === "acan", "acan");
    assert(classifyNotice("Request for Proposal").kind === "bid", "rfp is a bid");
    assert(classifyNotice("").kind === "unspecified", "blank type");
    // Midnight Toronto on Nov 9, 2026 (EST, UTC-5)
    assert(startOfTodayToronto(new Date("2026-11-09T15:00:00Z")) === "2026-11-09T05:00:00.000Z", startOfTodayToronto(new Date("2026-11-09T15:00:00Z")));
    assert(startOfTodayToronto(new Date("2026-07-01T03:00:00Z")) === "2026-06-30T04:00:00.000Z", "EDT day boundary");
  });

  await test("dedupeByExternalId collapses in-batch duplicates (no upsert self-conflict)", () => {
    const out = dedupeByExternalId([
      { external_id: "a", feed_key: "f", v: 1 },
      { external_id: "a", feed_key: "f", v: 2 },
      { external_id: "b", feed_key: "f", v: 3 },
    ]);
    assert(out.length === 2 && out.find((r) => r.external_id === "a")?.v === 2, "kept last");
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


  await test("source deep-links: GCSurplus period file, CanadaBuys notice, NS filtered rows", () => {
    const gcs = parseGcSurplusSoldCsv(load("gcsurplus_sold_sample.csv"));
    assert(gcs.every((r) => r.source_url.includes("/resource/")), "parser stores period resource URL");
    const sample = gcs.find((r) => r.closing_date === "2025-03-05");
    assert(sample, "2025-03-05 row");
    assert(
      sample.source_url ===
        "https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4/resource/f8d7daf0-40a0-457e-afe9-be791ab9fa3d",
      sample.source_url
    );
    const link = resolveLotSourceLink({
      feed_key: "gcsurplus_sold",
      external_id: "gcs-R4VA0018239",
      closing_date: "2025-04-02",
    });
    assert(link.kind === "gcsurplus_period_file", link.kind);
    assert(link.label === "Open source file", link.label);
    assert(link.findBy === "R4VA0018239", String(link.findBy));
    assert(link.href.includes("/resource/f8d7daf0-40a0-457e-afe9-be791ab9fa3d"), link.href);
    assert(gcsurplusSaleAccount("gcs-R4VA0018239-abc") === "R4VA0018239", "sale account from variant id");
    assert(gcsurplusSoldResourcePageUrl("2099-01-01") === "https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4", "unknown period falls back");

    const cb = parseCanadaBuysOpenTendersCsv(load("canadabuys_open_tenders_sample.csv"));
    assert(cb.every((r) => r.source_url.startsWith("https://canadabuys.canada.ca/en/tender-opportunities/tender-notice/")), "no MERX");
    assert(cb[0]!.source_url === canadabuysNoticePageUrl(cb[0]!.reference_number), "slug from ref");
    const tLink = resolveTenderSourceLink({ reference_number: "MX-443841357513" });
    assert(tLink.href === "https://canadabuys.canada.ca/en/tender-opportunities/tender-notice/mx-443841357513", tLink.href);
    assert(tLink.label === "View on CanadaBuys", tLink.label);

    const ns = parseNsPublicTenderCsv(load("ns_surplus_tender_sample.csv"));
    assert(ns[0]!.file_number, "file number");
    assert(ns[0]!.source_url === nsFilteredDataUrl("public_tender", ns[0]!.file_number), ns[0]!.source_url);
    const nsLink = resolveLotSourceLink({
      feed_key: "ns_surplus",
      external_id: "x",
      file_number: "AGR09-001",
      category: "public_tender",
    });
    assert(nsLink.kind === "ns_filtered_rows", nsLink.kind);
    assert(nsLink.href.includes("q=AGR09-001"), nsLink.href);
    assert(nsLink.label === "Find in NS open data", nsLink.label);
    const real = parseNsRealPropertyCsv(load("ns_surplus_real_property_sample.csv"));
    assert(real[0]!.source_url.includes("Surplus-Crown-Property-Disposal-Real-Property"), real[0]!.source_url);
  });

  if (failed) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log("\nAll open-data parser tests passed");
}

main();
