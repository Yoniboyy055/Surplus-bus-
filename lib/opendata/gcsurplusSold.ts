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

/**
 * GCSurplus LOT_DESC repeats the lot title back-to-back
 * ("Truck - RCMP EdsonTruck - RCMP Edson"). Collapse an exact doubled string.
 */
export function collapseDoubledText(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length >= 2 && t.length % 2 === 0) {
    const half = t.length / 2;
    if (t.slice(0, half) === t.slice(half)) return t.slice(0, half).trim();
  }
  // Also handle "A A" (doubled with a separating space).
  const m = t.match(/^(.{12,}?)\s+\1$/);
  return m?.[1] ? m[1].trim() : t;
}

function firstLine(text: string, max = 180): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? line.slice(0, max - 1) + "…" : line;
}

/**
 * Identity rules (PR #28 item 8):
 *  - Stable external id = SALE_CNTRCT_REG_ID (the sale contract number) when present.
 *  - GCSurplus repeats one sale once per asset location. Rows sharing a contract,
 *    closing date and sold amount are ONE sale: merged into one comp (locations
 *    joined) so comps are not double counted.
 *  - Rows sharing a contract but with different amounts/dates are distinct lots:
 *    id = contract + short hash of (title, closing, amount, city).
 *  - No contract id: legacy content hash (closing, amount, title, city, province).
 */
export function parseGcSurplusSoldCsv(csvText: string): GcSurplusSoldRow[] {
  const { rows } = parseCsv(csvText);
  const out: GcSurplusSoldRow[] = [];
  const byKey = new Map<string, GcSurplusSoldRow>();
  const contractVariants = new Map<string, Set<string>>();
  type Pending = { row: GcSurplusSoldRow; contract: string | null; saleKey: string };
  const pending: Pending[] = [];
  for (const row of rows) {
    const desc = collapseDoubledText((row.LOT_DESC || "").trim());
    const sold = moneyToNumber(row.SOLD_AMT);
    const closing = (row.CLOSING_DT || "").trim() || null;
    const city = (row.ASSET_LOC_CITY || "").trim() || null;
    const prov = provinceCode(row.ASSET_LOC_PROV);
    const items = (row.LOT_ITEMS || "").trim();
    if (!desc && sold == null) continue;
    const title = firstLine(desc || items || "GCSurplus sold lot");
    const contract = (row.SALE_CNTRCT_REG_ID || "").trim() || null;
    const saleKey = [closing || "", sold != null ? String(sold) : ""].join("|");
    if (contract) {
      if (!contractVariants.has(contract)) contractVariants.set(contract, new Set());
      contractVariants.get(contract)!.add(saleKey);
    }
    pending.push({
      contract,
      saleKey,
      row: {
        external_id: contract
          ? ""
          : stableId(["gcsurplus_sold", closing || "", sold != null ? String(sold) : "", title, city || "", prov || ""]),
        title,
        description: desc ? firstLine(desc, 500) : null,
        sold_amount: sold,
        min_bid_amount: moneyToNumber(row.MIN_BID_AMT),
        closing_date: closing,
        province: prov,
        city,
        category: items ? firstLine(items, 120) : null,
        source: "gcsurplus_sold",
        source_url: DATASET,
        licence_id: OGL_CANADA.id,
        status: "sold",
      },
    });
  }
  for (const p of pending) {
    let id = p.row.external_id;
    if (p.contract) {
      const variants = contractVariants.get(p.contract)!;
      id =
        variants.size === 1
          ? `gcs-${p.contract}`
          : `gcs-${p.contract}-${stableId([p.saleKey, p.row.title, p.row.city || ""]).slice(0, 10)}`;
    }
    const existing = byKey.get(id);
    if (existing) {
      // Same sale reported at another location: merge locations, keep one comp.
      const cities = new Set((existing.city || "").split("; ").filter(Boolean));
      if (p.row.city) cities.add(p.row.city);
      existing.city = cities.size ? Array.from(cities).join("; ") : null;
      continue;
    }
    const merged = { ...p.row, external_id: id };
    byKey.set(id, merged);
    out.push(merged);
  }
  return out;
}
