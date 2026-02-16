import type { ParserContext, ParserResult } from "./types";

/**
 * Ontario surplus parser. Mock now, real scrape next.
 */
export async function parseOnSurplus(ctx: ParserContext): Promise<ParserResult> {
  const now = Date.now();
  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: `on-${now}-1`,
        source_url: ctx.feedUrl ?? `${ctx.baseUrl}/page/surplus-government-property`,
        province: "ON",
        category: "Equipment",
        title: "Office Furniture Lot - Desks and Chairs",
        description: "Surplus government office furniture.",
        estimated_value: 2500,
        closing_date: null,
        issuing_entity: "Government of Ontario",
        status: "open",
      },
    ],
  };
}
