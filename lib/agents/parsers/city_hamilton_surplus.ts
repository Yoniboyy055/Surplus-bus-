import type { ParserContext, ParserResult, ParsedOpportunity } from "./types";
import { stableExternalIdFromUrl, stableExternalIdFromTuple } from "./idUtils";

/**
 * City of Hamilton surplus parser.
 * Directory page: extract sections/links; GovDeals is the auction platform.
 */
export async function parseCityHamiltonSurplus(ctx: ParserContext): Promise<ParserResult> {
  const url = ctx.feedUrl ?? `${ctx.baseUrl}/build-invest-grow/buying-selling-city/bids-and-tenders/surplus-items-auction`;
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

  // Extract h2/h3 headings as sections
  const headingRe = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    const raw = m[1];
    if (!raw) continue;
    const title = raw.replace(/\s+/g, " ").trim();
    if (!title || title.length < 3) continue;
    const extId = stableExternalIdFromTuple([ctx.parserKey, title, url]);
    if (seen.has(extId)) continue;
    seen.add(extId);
    opportunities.push({
      source: ctx.parserKey,
      external_id: extId,
      source_url: url,
      province: "ON",
      category: "Surplus",
      title: title,
      description: `City of Hamilton surplus: ${title}`,
      estimated_value: null,
      closing_date: null,
      issuing_entity: "City of Hamilton",
      status: "open",
    });
  }

  // Extract GovDeals link
  const govDealsRe = /href=["'](https?:\/\/[^"']*govdeals[^"']*hamilton[^"']*)["']/i;
  const govMatch = html.match(govDealsRe);
  const govDealsUrl = govMatch?.[1] ?? "https://www.govdeals.com/hamiltonon";

  const govExtId = stableExternalIdFromUrl(govDealsUrl);
  if (!seen.has(govExtId)) {
    seen.add(govExtId);
    opportunities.push({
      source: ctx.parserKey,
      external_id: govExtId,
      source_url: govDealsUrl,
      province: "ON",
      category: "Surplus",
      title: "Surplus Items Auction - GovDeals",
      description: "City of Hamilton surplus items auction on GovDeals.",
      estimated_value: null,
      closing_date: null,
      issuing_entity: "City of Hamilton",
      status: "open",
    });
  }

  if (opportunities.length === 0) {
    const fallbackExtId = stableExternalIdFromTuple([ctx.parserKey, "Surplus Items Auction", url]);
    opportunities.push({
      source: ctx.parserKey,
      external_id: fallbackExtId,
      source_url: url,
      province: "ON",
      category: "Surplus",
      title: "Surplus Items Auction",
      description: "City of Hamilton surplus equipment and office items.",
      estimated_value: null,
      closing_date: null,
      issuing_entity: "City of Hamilton",
      status: "open",
    });
  }

  return { opportunities };
}
