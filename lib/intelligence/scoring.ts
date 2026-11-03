/**
 * Ranking v2 (YkRO): one explainable scorer.
 * Hard-filter closed / past closing before calling.
 * Weights: Fit 40 · Time 25 · Value 20 · Data quality 10 · Freshness 5.
 */

export type OpportunityInput = {
  id: string;
  category: string | null;
  province?: string | null;
  estimated_value: number | null;
  closing_date: string | null;
  source_url?: string | null;
  first_seen_at?: string | null;
  status?: string | null;
};

export type UserPrefs = {
  provinces?: string[];
  categories?: string[];
  min_value?: number | null;
  max_value?: number | null;
};

export type ScorePart = {
  id: "fit" | "time" | "value" | "quality" | "fresh";
  weight: number;
  earned: number;
  label: string;
};

export type ScoreResult = {
  score: number;
  parts: ScorePart[];
  reasons: string[];
  excluded: boolean;
  exclude_reason?: string;
};

function daysLeft(closingDate: string | null): number | null {
  if (!closingDate) return null;
  const diff = new Date(closingDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isExcludedFromRanking(opp: OpportunityInput): { excluded: boolean; reason?: string } {
  const status = (opp.status || "").toLowerCase();
  if (["closed", "awarded", "expired", "sold", "withdrawn"].includes(status)) {
    return { excluded: true, reason: "closed_status" };
  }
  const d = daysLeft(opp.closing_date);
  if (d !== null && d < 0) return { excluded: true, reason: "past_closing" };
  return { excluded: false };
}

function fitScore(opp: OpportunityInput, prefs?: UserPrefs): { earned: number; reasons: string[] } {
  const weight = 40;
  if (!prefs || (!prefs.provinces?.length && !prefs.categories?.length && prefs.min_value == null && prefs.max_value == null)) {
    return { earned: 0, reasons: [] };
  }
  let earned = 0;
  const reasons: string[] = [];
  const prov = (opp.province || "").toLowerCase();
  if (prefs.provinces?.length) {
    const hit = prefs.provinces.some((p) => prov.includes(p.toLowerCase()) || p.toLowerCase().includes(prov));
    if (hit) {
      earned += 15;
      reasons.push(opp.province || "Province match");
    }
  }
  if (prefs.categories?.length && opp.category) {
    const cat = opp.category.toLowerCase();
    const hit = prefs.categories.some((c) => cat.includes(c.toLowerCase()) || c.toLowerCase().includes(cat));
    if (hit) {
      earned += 15;
      reasons.push(opp.category);
    }
  }
  if (prefs.min_value != null || prefs.max_value != null) {
    if (opp.estimated_value != null) {
      const minOk = prefs.min_value == null || opp.estimated_value >= prefs.min_value;
      const maxOk = prefs.max_value == null || opp.estimated_value <= prefs.max_value;
      if (minOk && maxOk) earned += 10;
    }
  }
  return { earned: Math.min(weight, earned), reasons };
}

function timeScore(closingDate: string | null): { earned: number; reasons: string[] } {
  const weight = 25;
  const d = daysLeft(closingDate);
  if (d === null) return { earned: weight * 0.3, reasons: ["Closing date unknown"] };
  let frac = 0.4;
  let reason = `Closes in ${d} days`;
  if (d >= 3 && d <= 14) {
    frac = 1;
  } else if (d >= 1 && d <= 2) {
    frac = 0.6;
    reason = `Closes in ${d} days (tight)`;
  } else if (d >= 15 && d <= 45) {
    frac = 0.7;
  } else if (d > 45) {
    frac = 0.4;
  }
  return { earned: weight * frac, reasons: [reason] };
}

function valueScore(estimatedValue: number | null, categoryMedian: number | null): { earned: number; reasons: string[] } {
  const weight = 20;
  if (estimatedValue == null || estimatedValue <= 0) {
    return { earned: weight * 0.5, reasons: [] };
  }
  if (!categoryMedian || categoryMedian <= 0) {
    return { earned: weight * 0.5, reasons: [`Value $${Math.round(estimatedValue).toLocaleString("en-CA")}`] };
  }
  const ratio = estimatedValue / categoryMedian;
  const frac = Math.max(0.3, Math.min(1, Math.log10(ratio + 1) / Math.log10(3)));
  return {
    earned: weight * frac,
    reasons: [`Value $${Math.round(estimatedValue).toLocaleString("en-CA")}`],
  };
}

function qualityScore(opp: OpportunityInput): { earned: number; reasons: string[] } {
  const weight = 10;
  const each = 2.5;
  let earned = 0;
  if (opp.closing_date) earned += each;
  if (opp.estimated_value != null) earned += each;
  if (opp.province) earned += each;
  if (opp.source_url) earned += each;
  return { earned, reasons: [] };
}

function freshScore(firstSeenAt: string | null | undefined): { earned: number; reasons: string[] } {
  const weight = 5;
  if (!firstSeenAt) return { earned: weight * 0.3, reasons: [] };
  const days = (Date.now() - new Date(firstSeenAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 2) return { earned: weight, reasons: ["New"] };
  if (days >= 14) return { earned: 0, reasons: [] };
  const frac = 1 - (days - 2) / 12;
  return { earned: weight * frac, reasons: [] };
}

export function scoreOpportunityV2(
  opp: OpportunityInput,
  opts?: { prefs?: UserPrefs; categoryMedian?: number | null }
): ScoreResult {
  const gate = isExcludedFromRanking(opp);
  if (gate.excluded) {
    return { score: 0, parts: [], reasons: [], excluded: true, exclude_reason: gate.reason };
  }

  const fit = fitScore(opp, opts?.prefs);
  const time = timeScore(opp.closing_date);
  const value = valueScore(opp.estimated_value, opts?.categoryMedian ?? null);
  const quality = qualityScore(opp);
  const fresh = freshScore(opp.first_seen_at);

  const parts: ScorePart[] = [
    { id: "fit", weight: 40, earned: fit.earned, label: "Fit" },
    { id: "time", weight: 25, earned: time.earned, label: "Time to act" },
    { id: "value", weight: 20, earned: value.earned, label: "Value" },
    { id: "quality", weight: 10, earned: quality.earned, label: "Data quality" },
    { id: "fresh", weight: 5, earned: fresh.earned, label: "Freshness" },
  ];

  const score = Math.max(0, Math.min(100, Math.round(parts.reduce((s, p) => s + p.earned, 0))));
  const reasons = [...fit.reasons, ...time.reasons, ...value.reasons, ...fresh.reasons].slice(0, 5);

  return { score, parts, reasons, excluded: false };
}

/** @deprecated Use scoreOpportunityV2. Kept for temporary call-site compatibility. */
export function urgencyScore(closingDate: string | null): number {
  return timeScore(closingDate).earned / 25;
}

/** @deprecated */
export function valueScoreLegacy(estimatedValue: number | null, averageByCategory: number): number {
  return valueScore(estimatedValue, averageByCategory || null).earned / 20;
}

/** @deprecated */
export function demandScore(_categoryCount90d: number, _maxCategoryCount90d: number): number {
  return 0.5;
}

/** @deprecated */
export function computeScore(components: { demand_score: number; value_score: number; urgency_score: number }): number {
  return 0.35 * components.demand_score + 0.4 * components.value_score + 0.25 * components.urgency_score;
}

/** @deprecated */
export function normalizeScore(base: number, minBase: number, maxBase: number): number {
  if (maxBase <= minBase) return 50;
  return Math.max(0, Math.min(100, Math.round(((base - minBase) / (maxBase - minBase)) * 100)));
}

/** @deprecated */
export function personalizedScore(
  normalizedScore: number,
  relevance: { province_match: number; category_match: number; value_match: number; urgency_match: number }
) {
  const relevanceScore =
    0.3 * relevance.province_match +
    0.3 * relevance.category_match +
    0.25 * relevance.value_match +
    0.15 * relevance.urgency_match;
  return Math.min(100, Math.round(normalizedScore * (1 + relevanceScore)));
}
