/**
 * Parser implementations for each parser_key.
 * Each parser fetches from base_url/feed_url and returns opportunities in canonical format.
 */

export type { ParsedOpportunity, ParserResult, ParserContext } from "./types";
import type { ParserContext, ParserResult } from "./types";
import { parseAbSurplus } from "./ab_surplus";
import { parseOnSurplus } from "./on_surplus";
import { parseCityTorontoSurplus } from "./city_toronto_surplus";
import { parseCityOttawaSurplus } from "./city_ottawa_surplus";
import { parseCityCalgarySurplus } from "./city_calgary_surplus";
import { parseCityEdmontonSurplus } from "./city_edmonton_surplus";

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
    case "city_ottawa_surplus":
      return parseCityOttawaSurplus(ctx);
    case "city_calgary_surplus":
      return parseCityCalgarySurplus(ctx);
    case "city_edmonton_surplus":
      return parseCityEdmontonSurplus(ctx);
    default:
      return { opportunities: [], error: `Unknown parser_key: ${parserKey}` };
  }
}

async function runGcBuyandsell(ctx: ParserContext): Promise<ParserResult> {
  // TODO: Replace with real scraper for item-level deep links
  const url = ctx.feedUrl ?? `${ctx.baseUrl}`;
  const title = "GCSurplus — Federal Surplus Assets";
  const { stableExternalIdFromTuple } = await import("./idUtils");
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
        description: "Federal government surplus assets available through GCSurplus crown auctions.",
        estimated_value: null,
        closing_date: null,
        issuing_entity: "Government of Canada",
        status: "open",
      },
    ],
  };
}

async function runCanadaBuys(ctx: ParserContext): Promise<ParserResult> {
  // TODO: Replace with real scraper for tender-level deep links
  const url = ctx.feedUrl ?? `${ctx.baseUrl}`;
  const title = "CanadaBuys — Federal Tenders & Procurement";
  const { stableExternalIdFromTuple } = await import("./idUtils");
  const extId = stableExternalIdFromTuple([ctx.parserKey, title, url]);

  return {
    opportunities: [
      {
        source: ctx.parserKey,
        external_id: extId,
        source_url: url,
        province: "ON",
        category: "Procurement",
        title,
        description: "Federal procurement opportunities and tender notices from CanadaBuys.",
        estimated_value: null,
        closing_date: null,
        issuing_entity: "Government of Canada",
        status: "open",
      },
    ],
  };
}
