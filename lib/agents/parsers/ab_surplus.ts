import type { ParserContext, ParserResult } from "./types";

/**
 * Alberta surplus parser. Mock now, real scrape next.
 */
export async function parseAbSurplus(ctx: ParserContext): Promise<ParserResult> {
  const now = Date.now();
  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: `ab-${now}-1`,
        source_url: `${ctx.baseUrl}/listing/12345`,
        province: "AB",
        category: "Vehicles",
        title: "2018 Ford F-150 XLT SuperCrew",
        description: "Fleet vehicle, regularly maintained.",
        estimated_value: 18500,
        closing_date: null,
        issuing_entity: "Government of Alberta",
        status: "open",
      },
    ],
  };
}
