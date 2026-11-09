/**
 * Which sold lots to leave out of a "typical sold range" — and why. Rows are never deleted or
 * hidden from lists; this only decides what feeds the range, and the page says how many were left
 * out with a one-tap "show all".
 *
 *  - nominal:  sold for C$0 or C$1 (token, transfer or data-entry prices).
 *  - bulk:     a lot of several items, so the price is not per item. Evidence: the lot's kind is
 *              "bulk" (lot of / assorted / 6 Office Chairs ...), or GCSurplus's quantity line says
 *              more than one unit ("Quantity: 9(set(s))", "... - Quantity: 18"), or it is sold by the
 *              pallet, skid, kg or lb.
 *  - manual:   marked hide_from_comps in data/kind_overrides.csv.
 *  - contract: Nova Scotia rows the feed marks "public_tender" (RFP / disposal-service awards such
 *              as "Request for Proposal"): an awarded contract amount, not the sale price of an item.
 *  - extreme:  outside the Tukey fences on log prices (Q1 / r^1.5 .. Q3 * r^1.5, r = Q3/Q1),
 *              i.e. the usual 1.5 x IQR rule applied to log prices (prices are skewed).
 */
import { classifyLot, overrideFor, type LotLike } from "./kinds";

export type CompRow = LotLike & { sold_amount: number | null; category?: string | null };
export type ExcludeReason = "nominal" | "contract" | "bulk" | "manual" | "extreme";
export type OutlierResult<T> = {
  kept: T[];
  excluded: Record<ExcludeReason, number>;
  excludedTotal: number;
  /** Price fences used for "extreme", when there were enough rows to compute them. */
  fences: { low: number; high: number } | null;
};

export const NOMINAL_MAX = 1;
/** Units that are a quantity by weight or by the pallet, even when the count is 1. */
const BULK_UNITS = new Set(["pallet", "pallets", "skid", "skids", "kg", "lb"]);

/** GCSurplus "Quantity: 3(each) : ... - Quantity: 18 ..." line → is this more than one item? */
export function quantityLot(category: string | null | undefined): boolean {
  const c = (category || "").trim();
  const m = c.match(/^Quantity:\s*([\d.,]+)\s*\(\(?\s*([a-z][a-z \-]*)/i);
  if (!m) return false;
  const n = Number.parseFloat(m[1]!.replace(/,/g, ""));
  if (Number.isFinite(n) && n > 1) return true;
  const unit = m[2]!.trim().toLowerCase().replace(/\($/, "");
  const inner = c.slice(m[0].length).match(/Quantity\s*:\s*-?\s*([\d.,]+)/i);
  const innerN = inner ? Number.parseFloat(inner[1]!.replace(/,/g, "")) : null;
  if (innerN != null && innerN > 1) return true;
  return BULK_UNITS.has(unit) && innerN == null;
}

function quantile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}

/** Minimum rows before the extreme-price rule applies (fewer rows: no fences). */
export const FENCE_MIN_N = 8;

export function excludeOutliers<T extends CompRow>(rows: T[]): OutlierResult<T> {
  const excluded: Record<ExcludeReason, number> = { nominal: 0, contract: 0, bulk: 0, manual: 0, extreme: 0 };
  const stage: T[] = [];
  for (const r of rows) {
    const a = r.sold_amount;
    if (typeof a !== "number" || !Number.isFinite(a)) continue; // no price: never in a range
    if (a <= NOMINAL_MAX) { excluded.nominal++; continue; }
    if (overrideFor(r)?.hideFromComps) { excluded.manual++; continue; }
    if (r.kind === "public_tender") { excluded.contract++; continue; }
    if (classifyLot(r) === "bulk" || quantityLot(r.category)) { excluded.bulk++; continue; }
    stage.push(r);
  }
  let fences: OutlierResult<T>["fences"] = null;
  let kept = stage;
  if (stage.length >= FENCE_MIN_N) {
    const logs = stage.map((r) => Math.log(r.sold_amount as number)).sort((x, y) => x - y);
    const q1 = quantile(logs, 0.25);
    const q3 = quantile(logs, 0.75);
    const iqr = q3 - q1;
    fences = { low: Math.exp(q1 - 1.5 * iqr), high: Math.exp(q3 + 1.5 * iqr) };
    kept = stage.filter((r) => {
      const ok = (r.sold_amount as number) >= fences!.low && (r.sold_amount as number) <= fences!.high;
      if (!ok) excluded.extreme++;
      return ok;
    });
  }
  return { kept, excluded, excludedTotal: Object.values(excluded).reduce((a, b) => a + b, 0), fences };
}
