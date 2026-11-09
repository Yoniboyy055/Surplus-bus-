import { createHash } from "crypto";
import { parseGcSurplusSoldCsv } from "./gcsurplusSold";
import { parseCanadaBuysOpenTendersCsv } from "./canadabuys";
import { parseNsPublicTenderCsv, parseNsRealPropertyCsv } from "./nsSurplus";
import { OGL_CANADA, OGL_NOVA_SCOTIA } from "./attribution";
import { OPEN_DATA_URLS } from "./urls";
import { extractFirstCsvFromZip } from "./zip";
import type { createServiceRoleClient } from "@/lib/supabase/serviceRole";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;
import { scoreOpportunityV2 } from "@/lib/intelligence/scoring";

export type IngestFeedResult = {
  feed_key: string;
  status: "ok" | "error" | "skipped";
  rows_parsed: number;
  rows_upserted: number;
  source_url: string;
  licence_id: string;
  error_message?: string;
  skipped_reason?: string;
  /** Set when an explicit row cap was applied (never silent). */
  row_cap?: number;
  rows_dropped_by_cap?: number;
};

/**
 * Optional explicit cap on GCSurplus sold rows per run.
 * Default: no cap (all parsed rows are upserted in batches of 500).
 * Set OPENDATA_GCSURPLUS_MAX_ROWS to a positive integer to cap; the cap and the
 * number of dropped rows are logged and returned in the run result.
 */
export function gcSurplusRowCap(): number | null {
  const raw = process.env.OPENDATA_GCSURPLUS_MAX_ROWS;
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function recordRun(
  supabase: ServiceRoleClient | null,
  row: Record<string, unknown>
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("open_data_ingest_runs").insert(row);
  if (error) {
    console.error(
      `[opendata-ingest] failed to record run for ${String(row.feed_key)}: ${error.message}`
    );
  }
}

/**
 * Postgres rejects an upsert batch that touches the same conflict key twice
 * ("ON CONFLICT DO UPDATE command cannot affect row a second time"). Keep the
 * last occurrence and log how many duplicates were collapsed (never silent).
 */
export function dedupeByExternalId<T extends { external_id: string; feed_key?: string }>(rows: T[]): T[] {
  const m = new Map<string, T>();
  for (const r of rows) m.set(`${r.feed_key ?? ""}|${r.external_id}`, r);
  const dropped = rows.length - m.size;
  if (dropped > 0) {
    console.warn(`[opendata-ingest] collapsed ${dropped} duplicate external_id rows in one batch`);
  }
  return Array.from(m.values());
}

/**
 * A feed that parses to zero rows is an upstream outage or format change, not
 * an empty dataset. Fail the run so it is recorded as an error and the UI
 * shows the data as failing/stale instead of "refreshed".
 */
function assertParsedRows(feed: string, n: number): void {
  if (n === 0) {
    throw new Error(`${feed}: parsed 0 rows (upstream outage or format change); existing rows kept`);
  }
}

function hasServiceRole(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function fetchText(url: string): Promise<{ text: string; finalUrl: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "SurplusBusOpenDataIngest/1.0 (+https://surplus-bus.vercel.app; open-data CSV only)",
      Accept: "text/csv,application/zip,*/*",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return { text: await res.text(), finalUrl: res.url };
}

/** GCSurplus publishes "What has sold" as half-year ZIPs (Jan–Jun, Jul–Dec). */
export function gcSurplusZipCandidates(now: Date, halves = 4): string[] {
  const base = "https://donnees-data.tpsgc-pwgsc.gc.ca/bi1/gcsurplus/gcsurplus-";
  const out: string[] = [];
  let y = now.getUTCFullYear();
  let h = now.getUTCMonth() < 6 ? 1 : 2;
  for (let i = 0; i < halves; i++) {
    out.push(h === 1 ? `${base}${y}-01-01--${y}-06-30-eng.zip` : `${base}${y}-07-01--${y}-12-31-eng.zip`);
    if (h === 1) { h = 2; y -= 1; } else { h = 1; }
  }
  if (!out.includes(OPEN_DATA_URLS.gcsurplusSoldLatestEngZip)) out.push(OPEN_DATA_URLS.gcsurplusSoldLatestEngZip);
  return out;
}

async function fetchGcSurplusCsvText(): Promise<{ text: string; sourceUrl: string }> {
  // Prefer latest ENG zip; fall back to previous half-year if needed.
  // Newest half-year first, so a newly published file is picked up automatically.
  const candidates = gcSurplusZipCandidates(new Date());
  let lastErr: Error | null = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "SurplusBusOpenDataIngest/1.0 (+open-data)",
          Accept: "application/zip,*/*",
        },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      // Pure-JS unzip (fflate, MIT): no OS `unzip` binary and no temp files.
      const { name, text, bytes } = extractFirstCsvFromZip(buf);
      console.log(
        `[opendata-ingest] gcsurplus_sold: unzipped ${name} (${bytes} bytes) from ${url}`
      );
      return { text, sourceUrl: url };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      console.warn(`[opendata-ingest] gcsurplus_sold: ${url} failed: ${lastErr.message}`);
    }
  }
  throw lastErr || new Error("GCSurplus zip fetch failed");
}

export async function ingestOpenDataFeeds(opts?: {
  feeds?: Array<"gcsurplus_sold" | "canadabuys" | "ns_surplus">;
  /** When true, parse only — no DB writes (tests / no service role). */
  dryRun?: boolean;
  /**
   * Inject a client (local e2e tests against PGlite). When set, writes go to it
   * even without SUPABASE_SERVICE_ROLE_KEY.
   */
  client?: ServiceRoleClient;
  /** Inject CSV text for unit tests (skips network). */
  fixtures?: {
    gcsurplusSoldCsv?: string;
    canadabuysCsv?: string;
    nsTenderCsv?: string;
    nsRealCsv?: string;
  };
}): Promise<IngestFeedResult[]> {
  const feeds = opts?.feeds ?? ["gcsurplus_sold", "canadabuys", "ns_surplus"];
  const dryRun = opts?.dryRun === true || (!opts?.client && !hasServiceRole());
  const results: IngestFeedResult[] = [];

  let supabase: ServiceRoleClient | null = null;
  if (!dryRun && opts?.client) {
    supabase = opts.client;
  } else if (!dryRun) {
    const { createServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    supabase = createServiceRoleClient();
  }

  for (const feed of feeds) {
    if (feed === "gcsurplus_sold") {
      const source_url = OPEN_DATA_URLS.gcsurplusSoldDataset;
      try {
        const text =
          opts?.fixtures?.gcsurplusSoldCsv ??
          (await fetchGcSurplusCsvText()).text;
        const parsed = parseGcSurplusSoldCsv(text);
        assertParsedRows("gcsurplus_sold", parsed.length);
        const cap = gcSurplusRowCap();
        const rows = cap != null ? parsed.slice(0, cap) : parsed;
        const dropped = parsed.length - rows.length;
        if (dropped > 0) {
          console.warn(
            `[opendata-ingest] gcsurplus_sold: OPENDATA_GCSURPLUS_MAX_ROWS=${cap} applied; ${dropped} of ${parsed.length} parsed rows NOT upserted this run`
          );
        }
        let upserted = 0;
        if (!dryRun && supabase) {
          const chunk = dedupeByExternalId(rows.map((r) => ({
            external_id: r.external_id,
            feed_key: "gcsurplus_sold",
            title: r.title,
            description: r.description,
            sold_amount: r.sold_amount,
            min_bid_amount: r.min_bid_amount,
            closing_date: r.closing_date,
            province: r.province,
            city: r.city,
            category: r.category,
            kind: "gcsurplus_sold",
            source_url: r.source_url,
            licence_id: r.licence_id,
            status: r.status,
            raw_hash: createHash("sha256").update(r.external_id + r.title).digest("hex").slice(0, 16),
            last_seen_at: new Date().toISOString(),
          })));
          for (let i = 0; i < chunk.length; i += 500) {
            const slice = chunk.slice(i, i + 500);
            const { error, count } = await supabase
              .from("price_history_lots")
              .upsert(slice, { onConflict: "feed_key,external_id", count: "exact" });
            if (error) throw new Error(error.message);
            upserted += count ?? slice.length;
          }
          await recordRun(supabase, {
            feed_key: "gcsurplus_sold",
            source_url,
            licence_id: OGL_CANADA.id,
            status: "ok",
            rows_parsed: parsed.length,
            rows_upserted: upserted,
            error_message:
              dropped > 0 ? `row cap ${cap} applied; ${dropped} rows not upserted` : null,
          });
        }
        results.push({
          feed_key: "gcsurplus_sold",
          status: dryRun ? "skipped" : "ok",
          rows_parsed: parsed.length,
          ...(cap != null ? { row_cap: cap, rows_dropped_by_cap: dropped } : {}),
          rows_upserted: dryRun ? 0 : upserted,
          source_url,
          licence_id: OGL_CANADA.id,
          skipped_reason: dryRun
            ? "dry_run_or_missing_SUPABASE_SERVICE_ROLE_KEY"
            : undefined,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[opendata-ingest] gcsurplus_sold failed: ${msg}`);
        await recordRun(supabase, {
          feed_key: "gcsurplus_sold",
          source_url,
          licence_id: OGL_CANADA.id,
          status: "error",
          rows_parsed: 0,
          rows_upserted: 0,
          error_message: msg,
        });
        results.push({
          feed_key: "gcsurplus_sold",
          status: "error",
          rows_parsed: 0,
          rows_upserted: 0,
          source_url,
          licence_id: OGL_CANADA.id,
          error_message: msg,
        });
      }
    }

    if (feed === "canadabuys") {
      const source_url = OPEN_DATA_URLS.canadabuysOpenTendersCsv;
      try {
        const text =
          opts?.fixtures?.canadabuysCsv ??
          (await fetchText(source_url)).text;
        const rows = parseCanadaBuysOpenTendersCsv(text);
        assertParsedRows("canadabuys", rows.length);
        let upserted = 0;
        if (!dryRun && supabase) {
          const payload = dedupeByExternalId(rows.map((r) => {
            const scored = scoreOpportunityV2({
              id: r.external_id,
              category: r.category,
              province: r.province,
              estimated_value: r.estimated_value,
              closing_date: r.closing_date,
              source_url: r.source_url,
              first_seen_at: r.publication_date,
              status: r.status,
            });
            return {
              external_id: r.external_id,
              feed_key: "canadabuys",
              reference_number: r.reference_number,
              solicitation_number: r.solicitation_number,
              title: r.title,
              description: r.description,
              status: r.status,
              province: r.province,
              category: r.category,
              procurement_category: r.procurement_category,
              notice_type: r.notice_type,
              issuing_entity: r.issuing_entity,
              source_url: r.source_url,
              publication_date: r.publication_date,
              closing_date: r.closing_date,
              licence_id: r.licence_id,
              regions_of_delivery: r.regions_of_delivery,
              score: scored.excluded ? null : scored.score,
              score_parts: scored.excluded ? null : scored.parts,
              score_reasons: scored.excluded ? null : scored.reasons,
              last_seen_at: new Date().toISOString(),
            };
          }));
          for (let i = 0; i < payload.length; i += 400) {
            const slice = payload.slice(i, i + 400);
            const { error } = await supabase
              .from("tender_notices")
              .upsert(slice, { onConflict: "feed_key,external_id" });
            if (error) throw new Error(error.message);
            upserted += slice.length;
          }
          await recordRun(supabase, {
            feed_key: "canadabuys",
            source_url,
            licence_id: OGL_CANADA.id,
            status: "ok",
            rows_parsed: rows.length,
            rows_upserted: upserted,
          });
        }
        results.push({
          feed_key: "canadabuys",
          status: dryRun ? "skipped" : "ok",
          rows_parsed: rows.length,
          rows_upserted: dryRun ? 0 : upserted,
          source_url,
          licence_id: OGL_CANADA.id,
          skipped_reason: dryRun
            ? "dry_run_or_missing_SUPABASE_SERVICE_ROLE_KEY"
            : undefined,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[opendata-ingest] canadabuys failed: ${msg}`);
        await recordRun(supabase, {
          feed_key: "canadabuys",
          source_url,
          licence_id: OGL_CANADA.id,
          status: "error",
          rows_parsed: 0,
          rows_upserted: 0,
          error_message: msg,
        });
        results.push({
          feed_key: "canadabuys",
          status: "error",
          rows_parsed: 0,
          rows_upserted: 0,
          source_url,
          licence_id: OGL_CANADA.id,
          error_message: msg,
        });
      }
    }

    if (feed === "ns_surplus") {
      const source_url = OPEN_DATA_URLS.nsPublicTenderCsv;
      try {
        const tenderText =
          opts?.fixtures?.nsTenderCsv ??
          (await fetchText(OPEN_DATA_URLS.nsPublicTenderCsv)).text;
        const realText =
          opts?.fixtures?.nsRealCsv ??
          (await fetchText(OPEN_DATA_URLS.nsRealPropertyCsv)).text;
        const rows = [
          ...parseNsPublicTenderCsv(tenderText),
          ...parseNsRealPropertyCsv(realText),
        ];
        assertParsedRows("ns_surplus", rows.length);
        let upserted = 0;
        if (!dryRun && supabase) {
          const payload = dedupeByExternalId(rows.map((r) => ({
            external_id: r.external_id,
            feed_key: "ns_surplus",
            title: r.title,
            description: null,
            sold_amount: r.contract_price,
            min_bid_amount: null,
            closing_date: null,
            province: r.province,
            city: r.location,
            category: r.kind,
            kind: r.kind,
            fiscal_year: r.fiscal_year,
            file_number: r.file_number,
            source_url: r.source_url,
            licence_id: r.licence_id,
            status: r.status,
            last_seen_at: new Date().toISOString(),
          })));
          for (let i = 0; i < payload.length; i += 500) {
            const slice = payload.slice(i, i + 500);
            const { error } = await supabase
              .from("price_history_lots")
              .upsert(slice, { onConflict: "feed_key,external_id" });
            if (error) throw new Error(error.message);
            upserted += slice.length;
          }
          await recordRun(supabase, {
            feed_key: "ns_surplus",
            source_url,
            licence_id: OGL_NOVA_SCOTIA.id,
            status: "ok",
            rows_parsed: rows.length,
            rows_upserted: upserted,
          });
        }
        results.push({
          feed_key: "ns_surplus",
          status: dryRun ? "skipped" : "ok",
          rows_parsed: rows.length,
          rows_upserted: dryRun ? 0 : upserted,
          source_url,
          licence_id: OGL_NOVA_SCOTIA.id,
          skipped_reason: dryRun
            ? "dry_run_or_missing_SUPABASE_SERVICE_ROLE_KEY"
            : undefined,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[opendata-ingest] ns_surplus failed: ${msg}`);
        await recordRun(supabase, {
          feed_key: "ns_surplus",
          source_url,
          licence_id: OGL_NOVA_SCOTIA.id,
          status: "error",
          rows_parsed: 0,
          rows_upserted: 0,
          error_message: msg,
        });
        results.push({
          feed_key: "ns_surplus",
          status: "error",
          rows_parsed: 0,
          rows_upserted: 0,
          source_url,
          licence_id: OGL_NOVA_SCOTIA.id,
          error_message: msg,
        });
      }
    }
  }

  return results;
}
