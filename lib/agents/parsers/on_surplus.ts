import type { ParserContext, ParserResult } from "./types";
import { parseLinkOutOnly } from "./linkOutOnly";

/**
 * Ontario provincial surplus.
 * Seeded ontario.ca page is 404; no stable public listing page found (YkData).
 * OILC properties portal prohibits reproducing listing data — link-out only.
 */
export async function parseOnSurplus(ctx: ParserContext): Promise<ParserResult> {
  return parseLinkOutOnly(ctx);
}
