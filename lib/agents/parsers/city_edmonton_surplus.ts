import type { ParserContext, ParserResult } from "./types";
import { parseLinkOutOnly } from "./linkOutOnly";

/** Official site only — MA Auctions link-out; no scrape. */
export async function parseCityEdmontonSurplus(ctx: ParserContext): Promise<ParserResult> {
  return parseLinkOutOnly(ctx);
}
