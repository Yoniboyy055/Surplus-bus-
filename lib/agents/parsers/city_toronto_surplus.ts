import type { ParserContext, ParserResult } from "./types";
import { parseLinkOutOnly } from "./linkOutOnly";

/** Official site only — mock row removed; North Toronto Auction not scraped. */
export async function parseCityTorontoSurplus(ctx: ParserContext): Promise<ParserResult> {
  return parseLinkOutOnly(ctx);
}
