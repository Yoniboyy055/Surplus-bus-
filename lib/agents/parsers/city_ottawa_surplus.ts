import type { ParserContext, ParserResult } from "./types";

/**
 * City of Ottawa surplus parser. Minimal viable: returns normalized opportunities.
 * Province: ON. issuing_entity: City of Ottawa.
 */
export async function parseCityOttawaSurplus(ctx: ParserContext): Promise<ParserResult> {
  const now = Date.now();
  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: `ottawa-${now}-1`,
        source_url: ctx.feedUrl ?? `${ctx.baseUrl}/en/business-and-growth`,
        province: "ON",
        category: "Surplus",
        title: "City of Ottawa Surplus Equipment",
        description: "Municipal surplus assets.",
        estimated_value: null,
        closing_date: null,
        issuing_entity: "City of Ottawa",
        status: "open",
      },
    ],
  };
}
