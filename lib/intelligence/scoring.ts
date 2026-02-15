export type OpportunityInput = {
  id: string;
  category: string | null;
  estimated_value: number | null;
  closing_date: string | null;
};

export type ScoreComponents = {
  demand_score: number;
  value_score: number;
  urgency_score: number;
  base_score: number;
};

function daysUntil(dateString: string | null): number {
  if (!dateString) return 30;
  const now = new Date();
  const target = new Date(dateString);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function urgencyScore(closingDate: string | null): number {
  const daysLeft = daysUntil(closingDate);
  if (daysLeft <= 3) return 1.2;
  if (daysLeft <= 7) return 1.0;
  if (daysLeft <= 30) return 0.9;
  return 0.8;
}

export function valueScore(estimatedValue: number | null, averageByCategory: number): number {
  if (!estimatedValue || averageByCategory <= 0) return 0.7;
  return Math.max(0.5, Math.min(1.5, estimatedValue / averageByCategory));
}

export function demandScore(categoryCount90d: number, maxCategoryCount90d: number): number {
  if (maxCategoryCount90d <= 0) return 0.5;
  return Math.max(0.3, Math.min(1.2, categoryCount90d / maxCategoryCount90d));
}

export function computeScore(components: Omit<ScoreComponents, "base_score">): number {
  return 0.35 * components.demand_score + 0.4 * components.value_score + 0.25 * components.urgency_score;
}

export function normalizeScore(base: number, minBase: number, maxBase: number): number {
  if (maxBase <= minBase) return 50;
  const normalized = ((base - minBase) / (maxBase - minBase)) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

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
