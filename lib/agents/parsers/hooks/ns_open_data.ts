import type { ParserContext, ParserResult } from "../types";

/**
 * HOOK (not implemented): Nova Scotia Surplus Crown Property open datasets (NS OGL).
 * - Public Tender: https://data.novascotia.ca/d/f89b-7ujj
 * - Real Property: https://data.novascotia.ca/d/2kw3-tjdw
 * Historical awards — enable after Yonatan approves ingest.
 */
export async function parseNsOpenDataHook(_ctx: ParserContext): Promise<ParserResult> {
  console.log("[hook] Nova Scotia open-data ingest not enabled — waiting on feed-direction decision");
  return { opportunities: [] };
}
