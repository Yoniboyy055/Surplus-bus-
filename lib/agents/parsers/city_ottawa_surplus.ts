import type { ParserContext, ParserResult } from "./types";
import { extractVendorLink } from "./discoveryUtils";

/**
 * City of Ottawa surplus — discovery-role parser.
 * This page does not host real auction listings. It redirects to a third-party
 * vendor platform (e.g. GovDeals or PublicSurplus). We extract the outbound
 * link to that vendor, log it, and return zero opportunities so the runner can
 * write it to sources.real_host_url via the reconUrl field.
 */
export async function parseCityOttawaSurplus(ctx: ParserContext): Promise<ParserResult> {
  const url = ctx.feedUrl ?? `${ctx.baseUrl}/en/business/procurement`;
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

  const reconUrl = extractVendorLink(html);
  if (reconUrl) {
    console.log(`[RECON] ${ctx.parserKey} → discovered real host at ${reconUrl}`);
    return { opportunities: [], reconUrl };
  }

  console.log(`[RECON] ${ctx.parserKey} → no outbound vendor link found on ${url}`);
  return { opportunities: [] };
}
