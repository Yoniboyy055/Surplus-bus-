import type { ParserContext, ParserResult } from "./types";
import { parseLinkOutOnly } from "./linkOutOnly";

/** Official site only — Incapsula; do not scrape or invent rows. */
export async function parseCityOttawaSurplus(ctx: ParserContext): Promise<ParserResult> {
  return parseLinkOutOnly(ctx);
}
