import type { ParserContext, ParserResult, ParsedOpportunity } from "./types";
import { stableExternalIdFromUrl } from "./idUtils";

/**
 * Infrastructure Ontario surplus properties parser.
 * Fetches directory page, extracts links to surplus portal and listings.
 */
export async function parseInfrastructureOntarioSurplus(
  ctx: ParserContext
): Promise<ParserResult> {
  const url = ctx.feedUrl ?? `${ctx.baseUrl}/en/what-we-do/real-estate-services/ontario-government-surplus-properties/`;
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

  // Extract links that look like surplus/property listings
  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const portalBase = "https://apps.infrastructureontario.ca";
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const rawHref = m[1];
    const rawText = m[2];
    if (!rawHref || !rawText) continue;
    let href = rawHref.trim();
    const text = rawText.replace(/\s+/g, " ").trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;
    if (href.startsWith("/")) href = ctx.baseUrl + href;
    else if (!href.startsWith("http")) href = new URL(href, url).href;

    if (
      href.includes("propertiesforsale") ||
      href.includes("property") ||
      (text.toLowerCase().includes("surplus") && href.includes("infrastructureontario"))
    ) {
      const extId = stableExternalIdFromUrl(href);
      if (seen.has(extId)) continue;
      seen.add(extId);
      opportunities.push({
        source: ctx.parserKey,
        external_id: extId,
        source_url: href,
        province: "ON",
        category: "Surplus",
        title: text || "Infrastructure Ontario Surplus Property",
        description: `Infrastructure Ontario surplus: ${text || href}`,
        estimated_value: null,
        closing_date: null,
        issuing_entity: "Infrastructure Ontario",
        status: "open",
      });
    }
  }

  // Fallback: portal URL as main listing
  const portalUrl = "https://apps.infrastructureontario.ca/propertiesforsale/Home.aspx";
  const portalExtId = stableExternalIdFromUrl(portalUrl);
  if (!seen.has(portalExtId)) {
    opportunities.push({
      source: ctx.parserKey,
      external_id: portalExtId,
      source_url: portalUrl,
      province: "ON",
      category: "Surplus",
      title: "Status of Surplus Properties",
      description: "Infrastructure Ontario surplus properties portal.",
      estimated_value: null,
      closing_date: null,
      issuing_entity: "Infrastructure Ontario",
      status: "open",
    });
  }

  if (opportunities.length === 0) {
    const fallbackExtId = stableExternalIdFromUrl(url);
    opportunities.push({
      source: ctx.parserKey,
      external_id: fallbackExtId,
      source_url: url,
      province: "ON",
      category: "Surplus",
      title: "Infrastructure Ontario Surplus Properties",
      description: "Ontario government surplus properties.",
      estimated_value: null,
      closing_date: null,
      issuing_entity: "Infrastructure Ontario",
      status: "open",
    });
  }

  return { opportunities };
}
