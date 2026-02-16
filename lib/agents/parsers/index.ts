/**
 * Parser implementations for each parser_key.
 * Each parser fetches from base_url/feed_url and returns opportunities in canonical format.
 */

export type { ParsedOpportunity, ParserResult, ParserContext } from "./types";
import type { ParserContext, ParserResult } from "./types";
import { parseAbSurplus } from "./ab_surplus";
import { parseOnSurplus } from "./on_surplus";
import { parseCityTorontoSurplus } from "./city_toronto_surplus";

/**
 * Runs the parser for the given key. Returns opportunities to upsert.
 */
export async function runParser(
  parserKey: string,
  ctx: ParserContext
): Promise<ParserResult> {
  switch (parserKey) {
    case "gc_buyandsell":
      return runGcBuyandsell(ctx);
    case "canadabuys":
      return runCanadaBuys(ctx);
    case "ab_surplus":
      return parseAbSurplus(ctx);
    case "on_surplus":
      return parseOnSurplus(ctx);
    case "city_toronto_surplus":
      return parseCityTorontoSurplus(ctx);
    default:
      return { opportunities: [], error: `Unknown parser_key: ${parserKey}` };
  }
}

async function runGcBuyandsell(ctx: ParserContext): Promise<ParserResult> {
  // TODO: Replace with real fetch when scraper is implemented
  const now = Date.now();
  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: `gc-${now}-1`,
        source_url: `${ctx.baseUrl}/mn-eng.cfm?snc=wfsav&sc=enc-bid&scn=12345`,
        province: "ON",
        category: "Equipment",
        title: "Heavy Duty Lathe - Industrial",
        description: "Industrial metal lathe",
        estimated_value: 4200,
        closing_date: null,
        issuing_entity: "Government of Canada",
        status: "open",
      },
    ],
  };
}

async function runCanadaBuys(ctx: ParserContext): Promise<ParserResult> {
  // TODO: Replace with real fetch when scraper is implemented
  const now = Date.now();
  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: `cb-${now}-1`,
        source_url: `${ctx.baseUrl}/en/tenders`,
        province: "ON",
        category: "Procurement",
        title: "Sample Federal Tender",
        description: "Placeholder for CanadaBuys integration",
        estimated_value: null,
        closing_date: null,
        issuing_entity: "Government of Canada",
        status: "open",
      },
    ],
  };
}
