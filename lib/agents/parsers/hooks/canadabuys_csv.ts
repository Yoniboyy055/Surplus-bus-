import type { ParserContext, ParserResult } from "../types";
import { parseCanadaBuysOpenTendersCsv, toParsedOpportunity } from "@/lib/opendata/canadabuys";
import { OPEN_DATA_URLS } from "@/lib/opendata/urls";

/**
 * CanadaBuys open tender CSV under OGL–Canada.
 * Never scrape HTML — robots Disallow:/ (YkData 2026-11-02).
 * Preferred URL: https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv
 */
export async function parseCanadaBuysCsvHook(ctx: ParserContext): Promise<ParserResult> {
  try {
    const url = ctx.feedUrl || OPEN_DATA_URLS.canadabuysOpenTendersCsv;
    if (!url.includes("opendata") && !url.endsWith(".csv")) {
      return {
        opportunities: [],
        error: "CanadaBuys ingest only allows official open-data CSV URLs",
      };
    }
    const res = await fetch(url, {
      headers: {
        "User-Agent": "SurplusBusOpenDataIngest/1.0 (+CSV only; no HTML scrape)",
        Accept: "text/csv,*/*",
      },
      cache: "no-store",
    });
    if (!res.ok) return { opportunities: [], error: `HTTP ${res.status}` };
    const rows = parseCanadaBuysOpenTendersCsv(await res.text());
    // Ranking hard-filters closed; still return open + closed for storage.
    return { opportunities: rows.map(toParsedOpportunity) };
  } catch (e) {
    return { opportunities: [], error: e instanceof Error ? e.message : String(e) };
  }
}
