import type { ParserContext, ParserResult } from "./types";

/**
 * City of Calgary surplus parser. Minimal viable: returns normalized opportunities.
 * Province: AB. issuing_entity: City of Calgary.
 */
export async function parseCityCalgarySurplus(ctx: ParserContext): Promise<ParserResult> {
  const now = Date.now();
  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: `calgary-${now}-1`,
        source_url: ctx.feedUrl ?? `${ctx.baseUrl}/buy-sell.html`,
        province: "AB",
        category: "Surplus",
        title: "City of Calgary Surplus Equipment",
        description: "Municipal surplus assets.",
        estimated_value: null,
        closing_date: null,
        issuing_entity: "City of Calgary",
        status: "open",
      },
    ],
  };
}
