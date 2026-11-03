/**
 * Parser registry.
 * Stub/mock rows deleted. Prohibited scrapes (GovDeals, MA Auctions, IO portal,
 * Ottawa, Hamilton lot scrape) are official-site-only (zero opportunities).
 * Open-data hooks exist but do not ingest until feed direction is approved.
 */

export type { ParsedOpportunity, ParserResult, ParserContext } from "./types";
import type { ParserContext, ParserResult } from "./types";
import { parseLinkOutOnly } from "./linkOutOnly";
import {
  parseCanadaBuysCsvHook,
  parseGcSurplusSoldCsvHook,
  parseNsOpenDataHook,
} from "./hooks";

export async function runParser(
  parserKey: string,
  ctx: ParserContext
): Promise<ParserResult> {
  switch (parserKey) {
    case "gc_buyandsell":
      return parseGcSurplusSoldCsvHook(ctx);
    case "canadabuys":
      return parseCanadaBuysCsvHook(ctx);
    case "ns_surplus_open_data":
      return parseNsOpenDataHook(ctx);
    case "ab_surplus":
    case "on_surplus":
    case "city_toronto_surplus":
    case "city_ottawa_surplus":
    case "city_calgary_surplus":
    case "city_edmonton_surplus":
    case "infrastructure_ontario_surplus":
    case "city_hamilton_surplus":
      return parseLinkOutOnly(ctx);
    default:
      return { opportunities: [], error: `Unknown parser_key: ${parserKey}` };
  }
}
