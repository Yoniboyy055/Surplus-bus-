import type { ParserContext, ParserResult } from "./types";
import { parseLinkOutOnly } from "./linkOutOnly";

/** Official site only — third-party auction User Agreement bans spiders/data-mining. */
export async function parseCityHamiltonSurplus(ctx: ParserContext): Promise<ParserResult> {
  return parseLinkOutOnly(ctx);
}
