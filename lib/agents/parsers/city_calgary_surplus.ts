import type { ParserContext, ParserResult, ParsedOpportunity } from "./types";
import { stableExternalIdFromTuple } from "./idUtils";

/**
 * City of Calgary surplus parser.
 * Directory page: extract sections, hash (title, url) for stable external_id.
 */
export async function parseCityCalgarySurplus(ctx: ParserContext): Promise<ParserResult> {
  const url = ctx.feedUrl ?? `${ctx.baseUrl}/buy-sell.html`;
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SurplusBus/1.0 (government surplus aggregator)" },
    });
    if (!res.ok) return { opportunities: [], error: `HTTP ${res.status}: ${url}` };
    html = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { opportunities: [], error: `Fetch failed: ${msg}` };
  }

  const opportunities: ParsedOpportunity[] = [];
  const seen = new Set<string>();

  // Extract h2/h3 headings as sections (directory page with no item URLs)
  const headingRe = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    const title = m[1].replace(/\s+/g, " ").trim();
    if (!title || title.length < 3) continue;
    const extId = stableExternalIdFromTuple([ctx.parserKey, title, url]);
    if (seen.has(extId)) continue;
    seen.add(extId);
    opportunities.push({
      source: ctx.parserKey,
      external_id: extId,
      source_url: url,
      province: "AB",
      category: "Surplus",
      title: title,
      description: `City of Calgary surplus: ${title}`,
      estimated_value: null,
      closing_date: null,
      issuing_entity: "City of Calgary",
      status: "open",
    });
  }

  if (opportunities.length === 0) {
    const fallbackTitle = "Surplus sales and public auctions";
    const extId = stableExternalIdFromTuple([ctx.parserKey, fallbackTitle, url]);
    opportunities.push({
      source: ctx.parserKey,
      external_id: extId,
      source_url: url,
      province: "AB",
      category: "Surplus",
      title: fallbackTitle,
      description: "Surplus equipment, furniture and materials for public auction.",
      estimated_value: null,
      closing_date: null,
      issuing_entity: "City of Calgary",
      status: "open",
    });
  }

  return { opportunities };
}
