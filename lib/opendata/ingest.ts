import { createHash } from "crypto";
import { parseGcSurplusSoldCsv } from "./gcsurplusSold";
import { parseCanadaBuysOpenTendersCsv } from "./canadabuys";
import { parseNsPublicTenderCsv, parseNsRealPropertyCsv } from "./nsSurplus";
import { OGL_CANADA, OGL_NOVA_SCOTIA } from "./attribution";
import { OPEN_DATA_URLS } from "./urls";
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
};

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

async function fetchGcSurplusCsvText(): Promise<{ text: string; sourceUrl: string }> {
  // Prefer latest ENG zip; fall back to previous half-year if needed.
  const candidates = [
    OPEN_DATA_URLS.gcsurplusSoldLatestEngZip,
    "https://donnees-data.tpsgc-pwgsc.gc.ca/bi1/gcsurplus/gcsurplus-2025-01-01--2025-06-30-eng.zip",
  ];
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
      const buf = Buffer.from(await res.arrayBuffer());
      // Lazy unzip via dynamic import of node:zlib only works for gzip; use JSZip-free approach:
      // unzip with child_process unzip if available, else require 'fflate' — avoid new deps:
      // write temp and unzip.
      const fs = await import("fs/promises");
      const os = await import("os");
      const path = await import("path");
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile);
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "gcsurplus-"));
      const zipPath = path.join(tmp, "in.zip");
      await fs.writeFile(zipPath, buf);
      await execFileAsync("unzip", ["-o", zipPath, "-d", tmp]);
      const files = await fs.readdir(tmp);
      const csvName = files.find((f) => f.endsWith(".csv"));
      if (!csvName) throw new Error("No CSV in GCSurplus zip");
      const text = await fs.readFile(path.join(tmp, csvName), "utf8");
      return { text, sourceUrl: url };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr || new Error("GCSurplus zip fetch failed");
}

export async function ingestOpenDataFeeds(opts?: {
  feeds?: Array<"gcsurplus_sold" | "canadabuys" | "ns_surplus">;
  /** When true, parse only — no DB writes (tests / no service role). */
  dryRun?: boolean;
  /** Inject CSV text for unit tests (skips network). */
  fixtures?: {
    gcsurplusSoldCsv?: string;
    canadabuysCsv?: string;
    nsTenderCsv?: string;
    nsRealCsv?: string;
  };
}): Promise<IngestFeedResult[]> {
  const feeds = opts?.feeds ?? ["gcsurplus_sold", "canadabuys", "ns_surplus"];
  const dryRun = opts?.dryRun === true || !hasServiceRole();
  const results: IngestFeedResult[] = [];

  let supabase: ReturnType<typeof import("@/lib/supabase/serviceRole").createServiceRoleClient> | null = null;
  if (!dryRun) {
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
        const rows = parseGcSurplusSoldCsv(text);
        let upserted = 0;
        if (!dryRun && supabase) {
          const chunk = rows.slice(0, 5000).map((r) => ({
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
          }));
          for (let i = 0; i < chunk.length; i += 500) {
            const slice = chunk.slice(i, i + 500);
            const { error, count } = await supabase
              .from("price_history_lots")
              .upsert(slice, { onConflict: "feed_key,external_id", count: "exact" });
            if (error) throw new Error(error.message);
            upserted += count ?? slice.length;
          }
          await supabase.from("open_data_ingest_runs").insert({
            feed_key: "gcsurplus_sold",
            source_url,
            licence_id: OGL_CANADA.id,
            status: "ok",
            rows_parsed: rows.length,
            rows_upserted: upserted,
          });
        }
        results.push({
          feed_key: "gcsurplus_sold",
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
        let upserted = 0;
        if (!dryRun && supabase) {
          const payload = rows.map((r) => {
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
          });
          for (let i = 0; i < payload.length; i += 400) {
            const slice = payload.slice(i, i + 400);
            const { error } = await supabase
              .from("tender_notices")
              .upsert(slice, { onConflict: "feed_key,external_id" });
            if (error) throw new Error(error.message);
            upserted += slice.length;
          }
          await supabase.from("open_data_ingest_runs").insert({
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
        let upserted = 0;
        if (!dryRun && supabase) {
          const payload = rows.map((r) => ({
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
            awarded_to: r.awarded_to,
            source_url: r.source_url,
            licence_id: r.licence_id,
            status: r.status,
            last_seen_at: new Date().toISOString(),
          }));
          for (let i = 0; i < payload.length; i += 500) {
            const slice = payload.slice(i, i + 500);
            const { error } = await supabase
              .from("price_history_lots")
              .upsert(slice, { onConflict: "feed_key,external_id" });
            if (error) throw new Error(error.message);
            upserted += slice.length;
          }
          await supabase.from("open_data_ingest_runs").insert({
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
