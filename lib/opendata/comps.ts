/**
 * Sold-comp statistics from verified closed lots (price_history_lots).
 * Guidance band (p25–p75) only when n >= BAND_MIN_N; otherwise rows only.
 * This is historical context, not an appraisal or a max-bid recommendation.
 */
export const BAND_MIN_N = 20;

export type CompStats = {
  n: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  showBand: boolean;
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const v = sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
  return Math.round(v);
}

/** Only positive, finite sold amounts count as verified comps. */
export function computeCompStats(amounts: Array<number | null | undefined>): CompStats | null {
  const xs = amounts
    .filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0)
    .sort((a, b) => a - b);
  if (!xs.length) return null;
  return {
    n: xs.length,
    min: xs[0]!,
    p25: quantile(xs, 0.25),
    median: quantile(xs, 0.5),
    p75: quantile(xs, 0.75),
    max: xs[xs.length - 1]!,
    showBand: xs.length >= BAND_MIN_N,
  };
}

/** Escape user input for a PostgREST ilike pattern (no wildcards from users). */
export function toIlikePattern(q: string): string {
  const cleaned = q.replace(/[%_*,()\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `%${cleaned}%`;
}

export function formatCad(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `C$${Math.round(n).toLocaleString("en-CA")}`;
}
