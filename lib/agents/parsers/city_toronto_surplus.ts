import type { ParserContext, ParserResult } from "./types";

/**
 * City of Toronto surplus parser. Mock now, real scrape next.
 */
export async function parseCityTorontoSurplus(ctx: ParserContext): Promise<ParserResult> {
  const now = Date.now();
  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: `tor-${now}-1`,
        source_url: ctx.feedUrl ?? `${ctx.baseUrl}/services-payments/streets-parking-transportation/transportation-services/surplus-vehicles-equipment/`,
        province: "ON",
        category: "Surplus",
        title: "City of Toronto Surplus Vehicle",
        description: "Municipal fleet surplus equipment.",
        estimated_value: 12000,
        closing_date: null,
        issuing_entity: "City of Toronto",
        status: "open",
      },
    ],
  };
}
