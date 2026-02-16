/**
 * Parser implementations for each parser_key.
 * Each parser fetches from base_url/feed_url and returns opportunities in canonical format.
 */

export type ParsedOpportunity = {
  source: string;
  external_id: string;
  source_url: string;
  province: string;
  category: string | null;
  title: string;
  description: string | null;
  estimated_value: number | null;
  closing_date: string | null;
  issuing_entity: string | null;
  status: string;
};

export type ParserResult = {
  opportunities: ParsedOpportunity[];
  error?: string;
};

export type ParserContext = {
  baseUrl: string;
  feedUrl: string | null;
  parserKey: string;
};

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
      return runAbSurplus(ctx);
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

async function runAbSurplus(ctx: ParserContext): Promise<ParserResult> {
  // TODO: Replace with real fetch when scraper is implemented
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
