import type { ParserContext, ParserResult } from "./types";
import { getSourceDescriptor } from "@/lib/sources/modes";

/**
 * Returns zero opportunities. Used for official-site-only and pending-hook sources.
 * Never invents placeholder listing rows.
 */
export async function parseLinkOutOnly(ctx: ParserContext): Promise<ParserResult> {
  const desc = getSourceDescriptor(ctx.parserKey);
  const note = desc?.honesty ?? "Official site only — no listing rows emitted.";
  console.log(`[link-out] ${ctx.parserKey}: ${note}`);
  return { opportunities: [] };
}
