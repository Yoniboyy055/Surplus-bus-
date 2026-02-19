import type { ParserContext, ParserResult } from "./types";
import { stableExternalIdFromTuple } from "./idUtils";

/**
 * Ontario surplus parser.
 * Placeholder: returns a single entry linking to the real Ontario surplus page.
 * TODO: Replace with real scraper when item-level inventory is available.
 */
export async function parseOnSurplus(ctx: ParserContext): Promise<ParserResult> {
  const url = ctx.feedUrl ?? `${ctx.baseUrl}`;
  const title = "Government of Ontario — Surplus Property";
  const extId = stableExternalIdFromTuple([ctx.parserKey, title, url]);

  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: extId,
        source_url: url,
        province: "ON",
        category: "Surplus",
        title,
        description: "Provincial surplus government property including office furniture and equipment.",
        estimated_value: null,
        closing_date: null,
        issuing_entity: "Government of Ontario",
        status: "open",
      },
    ],
  };
}
