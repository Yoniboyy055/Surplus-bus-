import type { ParserContext, ParserResult } from "./types";

/**
 * City of Edmonton surplus parser. Minimal viable: returns normalized opportunities.
 * Province: AB. issuing_entity: City of Edmonton.
 */
export async function parseCityEdmontonSurplus(ctx: ParserContext): Promise<ParserResult> {
  const now = Date.now();
  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: `edmonton-${now}-1`,
        source_url:
          ctx.feedUrl ??
          `${ctx.baseUrl}/business_economy/vehicle-and-equipment-sales`,
        province: "AB",
        category: "Surplus",
        title: "City of Edmonton Surplus Equipment",
        description: "Municipal surplus vehicles and equipment.",
        estimated_value: null,
        closing_date: null,
        issuing_entity: "City of Edmonton",
        status: "open",
      },
    ],
  };
}
