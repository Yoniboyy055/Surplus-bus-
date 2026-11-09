import type { ParserContext, ParserResult } from "../types";
import { parseGcSurplusSoldCsv } from "@/lib/opendata/gcsurplusSold";
import { OPEN_DATA_URLS } from "@/lib/opendata/urls";

/**
 * GCSurplus “What has Sold” open dataset (OGL–Canada).
 * Sold history only — not live open auctions. Personal contact fields are not emitted.
 * Dataset: https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4
 *
 * Agent runner still expects ParsedOpportunity[]; sold lots are terminal and will be
 * hard-filtered from ranking. Prefer /api/cron/opendata-ingest for price_history_lots.
 */
export async function parseGcSurplusSoldCsvHook(ctx: ParserContext): Promise<ParserResult> {
  try {
    const url =
      ctx.feedUrl ||
      OPEN_DATA_URLS.gcsurplusSoldLatestEngZip;
    // Prefer cron ingest path for zip; if a CSV feedUrl is configured, parse it.
    if (!url.toLowerCase().endsWith(".csv") && !url.includes("rows.csv")) {
      console.log(
        "[gcsurplus_sold] Zip/open-data ingest is handled by /api/cron/opendata-ingest — returning 0 agent opportunities (sold history is not ranked)."
      );
      return { opportunities: [] };
    }
    const res = await fetch(url, {
      headers: { "User-Agent": "SurplusBusOpenDataIngest/1.0", Accept: "text/csv" },
      cache: "no-store",
    });
    if (!res.ok) return { opportunities: [], error: `HTTP ${res.status}` };
    const rows = parseGcSurplusSoldCsv(await res.text());
    return {
      opportunities: rows.map((r) => ({
        source: "gc_buyandsell",
        external_id: r.external_id,
        source_url: r.source_url,
        province: r.province || "CA",
        category: r.category,
        title: r.title,
        description: r.description,
        estimated_value: r.sold_amount,
        closing_date: r.closing_date,
        issuing_entity: "GCSurplus",
        status: "sold",
        current_price: r.sold_amount,
        is_terminal: true,
      })),
    };
  } catch (e) {
    return { opportunities: [], error: e instanceof Error ? e.message : String(e) };
  }
}
