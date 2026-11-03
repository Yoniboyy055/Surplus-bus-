import type { ParserContext, ParserResult } from "./types";
import { parseLinkOutOnly } from "./linkOutOnly";

/** Official site only — placeholder mock row removed. */
export async function parseAbSurplus(ctx: ParserContext): Promise<ParserResult> {
  return parseLinkOutOnly(ctx);
}
