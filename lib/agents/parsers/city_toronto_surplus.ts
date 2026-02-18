import type { ParserContext, ParserResult } from "./types";
import { stableExternalIdFromTuple } from "./idUtils";

/**
 * City of Toronto surplus parser.
 * Placeholder: returns a single entry linking to the real Toronto surplus page.
 * TODO: Replace with real scraper when item-level inventory is available.
 */
export async function parseCityTorontoSurplus(ctx: ParserContext): Promise<ParserResult> {
  const url = ctx.feedUrl ?? `${ctx.baseUrl}`;
  const title = "City of Toronto — Surplus Vehicles & Equipment";
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
        description: "Municipal fleet surplus vehicles and equipment available for public purchase.",
        estimated_value: null,
        closing_date: null,
        issuing_entity: "City of Toronto",
        status: "open",
      },
    ],
  };
}
