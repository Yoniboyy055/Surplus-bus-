import type { ParserContext, ParserResult } from "./types";
import { stableExternalIdFromTuple } from "./idUtils";

/**
 * Alberta surplus parser.
 * Placeholder: returns a single entry linking to the real Alberta surplus page.
 * TODO: Replace with real scraper when item-level inventory is available.
 */
export async function parseAbSurplus(ctx: ParserContext): Promise<ParserResult> {
  const url = ctx.feedUrl ?? `${ctx.baseUrl}`;
  const title = "Government of Alberta — Surplus Assets";
  const extId = stableExternalIdFromTuple([ctx.parserKey, title, url]);

  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: extId,
        source_url: url,
        province: "AB",
        category: "Surplus",
        title,
        description: "Provincial surplus assets including vehicles, equipment, and furniture.",
        estimated_value: null,
        closing_date: null,
        issuing_entity: "Government of Alberta",
        status: "open",
      },
    ],
  };
}
