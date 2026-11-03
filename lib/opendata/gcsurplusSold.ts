import { createHash } from "crypto";
import { parseCsv, moneyToNumber, provinceCode } from "./csv";
import { OGL_CANADA } from "./attribution";
import { OPEN_DATA_URLS } from "./urls";

/** Sold-lot price history row (never ranked as open opportunity). */
export type GcSurplusSoldRow = {
  external_id: string;
  title: string;
  description: string | null;
  sold_amount: number | null;
  min_bid_amount: number | null;
  closing_date: string | null;
  province: string | null;
  city: string | null;
  postal_code: string | null;
  category: string | null;
  source: "gcsurplus_sold";
  source_url: string;
  licence_id: typeof OGL_CANADA.id;
  status: "sold";
  /** Personal contact fields intentionally omitted from public model. */
};

const DATASET = OPEN_DATA_URLS.gcsurplusSoldDataset;

function stableId(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

function firstLine(text: string, max = 180): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? line.slice(0, max - 1) + "…" : line;
}

export function parseGcSurplusSoldCsv(csvText: string): GcSurplusSoldRow[] {
  const { rows } = parseCsv(csvText);
  const out: GcSurplusSoldRow[] = [];
  for (const row of rows) {
    const desc = (row.LOT_DESC || "").trim();
    const sold = moneyToNumber(row.SOLD_AMT);
    const closing = (row.CLOSING_DT || "").trim() || null;
    const city = (row.ASSET_LOC_CITY || "").trim() || null;
    const prov = provinceCode(row.ASSET_LOC_PROV);
    const items = (row.LOT_ITEMS || "").trim();
    if (!desc && sold == null) continue;
    const title = firstLine(desc || items || "GCSurplus sold lot");
    const external_id = stableId([
      "gcsurplus_sold",
      closing || "",
      sold != null ? String(sold) : "",
      title,
      city || "",
      prov || "",
      (row.ASSET_LOC_POSTAL_CD || "").trim(),
    ]);
    out.push({
      external_id,
      title,
      description: desc ? firstLine(desc, 500) : null,
      sold_amount: sold,
      min_bid_amount: moneyToNumber(row.MIN_BID_AMT),
      closing_date: closing,
      province: prov,
      city,
      postal_code: (row.ASSET_LOC_POSTAL_CD || "").trim() || null,
      category: items ? firstLine(items, 120) : null,
      source: "gcsurplus_sold",
      source_url: DATASET,
      licence_id: OGL_CANADA.id,
      status: "sold",
    });
  }
  return out;
}
