import { createHash } from "crypto";
import { parseCsv, moneyToNumber } from "./csv";
import { OGL_NOVA_SCOTIA } from "./attribution";
import { OPEN_DATA_URLS } from "./urls";

export type NsSurplusHistoryRow = {
  external_id: string;
  kind: "public_tender" | "real_property";
  fiscal_year: string | null;
  file_number: string | null;
  location: string | null;
  title: string;
  awarded_to: string | null;
  paid_party: string | null;
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

function firstOrgName(raw: string): string {
  // Prefer first segment before comma for individual addresses; keep orgs intact.
  const t = raw.trim();
  if (!t) return "";
  if (t.includes(",") && /road|street|ave|blvd|ns\b|b\d/i.test(t)) {
    return (t.split(",")[0] ?? t).trim();
  }
  return t.length > 120 ? t.slice(0, 119) + "…" : t;
}

export function parseNsPublicTenderCsv(csvText: string): NsSurplusHistoryRow[] {
  const { rows } = parseCsv(csvText);
  const out: NsSurplusHistoryRow[] = [];
  for (const row of rows) {
    const file = (row["File #"] || row["File No."] || "").trim();
    const desc = (row.Description || "").trim();
    if (!file && !desc) continue;
    const awarded = firstOrgName(row["Successful Contractor"] || "");
    const priceRaw = (row["Contract Price"] || "").trim() || null;
    out.push({
      external_id: stableId("ns_tender", [file, desc, awarded, priceRaw || ""]),
      kind: "public_tender",
      fiscal_year: (row["Fiscal Year"] || "").trim() || null,
      file_number: file || null,
      location: (row.Location || "").trim() || null,
      title: desc || `NS surplus tender ${file}`,
      awarded_to: awarded || null,
      paid_party: (row["Paid By"] || "").trim() || null,
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
    const awarded = firstOrgName(row.Awarded || "");
    const priceRaw = (row["Contract Price"] || "").trim() || null;
    out.push({
      external_id: stableId("ns_real", [file, desc, awarded, priceRaw || ""]),
      kind: "real_property",
      fiscal_year: (row["Fiscal Year"] || "").trim() || null,
      file_number: file || null,
      location: (row.Location || "").trim() || null,
      title: desc || `NS surplus real property ${file}`,
      awarded_to: awarded || null,
      paid_party: (row["Paid To"] || "").trim() || null,
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
