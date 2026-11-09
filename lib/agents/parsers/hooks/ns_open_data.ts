import type { ParserContext, ParserResult } from "../types";
import { parseNsPublicTenderCsv, parseNsRealPropertyCsv } from "@/lib/opendata/nsSurplus";
import { OPEN_DATA_URLS } from "@/lib/opendata/urls";

/**
 * Nova Scotia Surplus Crown Property open datasets (OGL–NS).
 * Historical awards — prefer /api/cron/opendata-ingest → price_history_lots.
 */
export async function parseNsOpenDataHook(_ctx: ParserContext): Promise<ParserResult> {
  try {
    const [tenderRes, realRes] = await Promise.all([
      fetch(OPEN_DATA_URLS.nsPublicTenderCsv, {
        headers: { "User-Agent": "SurplusBusOpenDataIngest/1.0", Accept: "text/csv" },
        cache: "no-store",
      }),
      fetch(OPEN_DATA_URLS.nsRealPropertyCsv, {
        headers: { "User-Agent": "SurplusBusOpenDataIngest/1.0", Accept: "text/csv" },
        cache: "no-store",
      }),
    ]);
    if (!tenderRes.ok || !realRes.ok) {
      return {
        opportunities: [],
        error: `NS open data HTTP tender=${tenderRes.status} real=${realRes.status}`,
      };
    }
    const rows = [
      ...parseNsPublicTenderCsv(await tenderRes.text()),
      ...parseNsRealPropertyCsv(await realRes.text()),
    ];
    return {
      opportunities: rows.map((r) => ({
        source: "ns_surplus_open_data",
        external_id: r.external_id,
        source_url: r.source_url,
        province: "NS",
        category: r.kind,
        title: r.title,
        description: null, // awardee / payer names are not stored (possible personal data)
        estimated_value: r.contract_price,
        closing_date: null,
        issuing_entity: "Government of Nova Scotia",
        status: "awarded",
        is_terminal: true,
      })),
    };
  } catch (e) {
    return { opportunities: [], error: e instanceof Error ? e.message : String(e) };
  }
}
