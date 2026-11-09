import { createHash } from "crypto";
import { parseCsv, moneyToNumber } from "./csv";
import { OGL_NOVA_SCOTIA } from "./attribution";
import { OPEN_DATA_URLS } from "./urls";

/**
 * Personal-data treatment (PR #28 review): the source columns
 * "Successful Contractor" / "Awarded" (who bought) and "Paid By" / "Paid To"
 * can name private individuals. OGL–NS does not cover personal information,
 * so these columns are dropped at parse time and never reach storage, the
 * agent runner, or the UI. They are also excluded from external_id hashing.
 */
export const NS_DROPPED_PERSONAL_COLUMNS = [
  "Successful Contractor",
  "Awarded",
  "Paid By",
  "Paid To",
] as const;

export type NsSurplusHistoryRow = {
  external_id: string;
  kind: "public_tender" | "real_property";
  fiscal_year: string | null;
  file_number: string | null;
  location: string | null;
  title: string;
  contract_price: number | null;
  contract_price_raw: string | null;
  province: "NS";
  source: "ns_surplus_open_data";
  source_url: string;
  licence_id: typeof OGL_NOVA_SCOTIA.id;
  status: "awarded";
};

function stableId(kind: string, parts: string[]): string {
  return createHash("sha256").update([kind, ...parts].join("|")).digest("hex").slice(0, 32);
}

export function parseNsPublicTenderCsv(csvText: string): NsSurplusHistoryRow[] {
  const { rows } = parseCsv(csvText);
  const out: NsSurplusHistoryRow[] = [];
  for (const row of rows) {
    const file = (row["File #"] || row["File No."] || "").trim();
    const desc = (row.Description || "").trim();
    if (!file && !desc) continue;
    const priceRaw = (row["Contract Price"] || "").trim() || null;
    const fiscal = (row["Fiscal Year"] || "").trim();
    const location = (row.Location || "").trim();
    out.push({
      external_id: stableId("ns_tender", [file, fiscal, desc, location, priceRaw || ""]),
      kind: "public_tender",
      fiscal_year: fiscal || null,
      file_number: file || null,
      location: location || null,
      title: desc || `NS surplus tender ${file}`,
      contract_price: moneyToNumber(priceRaw),
      contract_price_raw: priceRaw,
      province: "NS",
      source: "ns_surplus_open_data",
      source_url: OPEN_DATA_URLS.nsPublicTenderPage,
      licence_id: OGL_NOVA_SCOTIA.id,
      status: "awarded",
    });
  }
  return out;
}

export function parseNsRealPropertyCsv(csvText: string): NsSurplusHistoryRow[] {
  const { rows } = parseCsv(csvText);
  const out: NsSurplusHistoryRow[] = [];
  for (const row of rows) {
    const file = (row["File No."] || row["File #"] || "").trim();
    const desc = (row.Description || "").trim();
    if (!file && !desc) continue;
    const priceRaw = (row["Contract Price"] || "").trim() || null;
    const fiscal = (row["Fiscal Year"] || "").trim();
    const location = (row.Location || "").trim();
    out.push({
      external_id: stableId("ns_real", [file, fiscal, desc, location, priceRaw || ""]),
      kind: "real_property",
      fiscal_year: fiscal || null,
      file_number: file || null,
      location: location || null,
      title: desc || `NS surplus real property ${file}`,
      contract_price: moneyToNumber(priceRaw),
      contract_price_raw: priceRaw,
      province: "NS",
      source: "ns_surplus_open_data",
      source_url: OPEN_DATA_URLS.nsRealPropertyPage,
      licence_id: OGL_NOVA_SCOTIA.id,
      status: "awarded",
    });
  }
  return out;
}
