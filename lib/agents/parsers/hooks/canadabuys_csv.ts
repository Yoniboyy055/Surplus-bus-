import type { ParserContext, ParserResult } from "../types";

/**
 * HOOK (not implemented): CanadaBuys open tender CSV under OGL–Canada.
 * Preferred URL (YkData audit): https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv
 * robots.txt Disallow:/ blocks HTML scrape — use this CSV path when Yonatan approves ingest.
 */
export async function parseCanadaBuysCsvHook(_ctx: ParserContext): Promise<ParserResult> {
  console.log("[hook] canadabuys CSV ingest not enabled — waiting on feed-direction decision");
  return { opportunities: [] };
}
