/**
 * THE single source of truth for plans and prices. The pricing page, the
 * homepage, /api/subscription, checkout and feature gates all read from here.
 *
 * PRICES ARE A PROPOSAL FOR YONATAN'S DECISION (REVIEW_PACKAGE approvals list).
 * Default per launch/research/competitor_pricing_scan.md: C$12/mo inside the
 * cleared C$9–19 band, optional annual C$119/yr (scan range C$99–129/yr).
 * Stripe Price IDs come from env vars; checkout stays disabled until they're set.
 */
export type PlanId = "free" | "pro_monthly" | "pro_annual";

export type Plan = {
  id: PlanId;
  name: string;
  tier: "free" | "pro";
  priceCad: number;
  interval: "month" | "year" | null;
  /** Env var holding the Stripe Price ID (test or live). */
  stripePriceEnv: string | null;
  limits: { savedSearches: number; emailAlerts: boolean };
  features: string[];
};

export const CURRENCY = "CAD";

const PRO_FEATURES = [
  "Sold-price range (p25–p75) and full comps for any search",
  "Up to 25 saved searches",
  "Daily or weekly email alerts with sold-price context",
  "In-app inbox of new matches",
];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tier: "free",
    priceCad: 0,
    interval: null,
    stripePriceEnv: null,
    limits: { savedSearches: 1, emailAlerts: false },
    features: [
      "Sold-price history and open tenders",
      "Comps and sold-price range for any search",
      "1 saved search with in-app alerts",
    ],
  },
  pro_monthly: {
    id: "pro_monthly",
    name: "Pro",
    tier: "pro",
    priceCad: 12,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_PRO_MONTHLY",
    limits: { savedSearches: 25, emailAlerts: true },
    features: PRO_FEATURES,
  },
  pro_annual: {
    id: "pro_annual",
    name: "Pro · annual",
    tier: "pro",
    priceCad: 119,
    interval: "year",
    stripePriceEnv: "STRIPE_PRICE_PRO_ANNUAL",
    limits: { savedSearches: 25, emailAlerts: true },
    features: PRO_FEATURES,
  },
};

/** Shown next to alert features: official portals already offer free new-lot alerts. */
export const ALERTS_HONESTY_NOTE =
  "GCSurplus, GovDeals and CanadaBuys offer free new-listing alerts on their own sites. Our alerts add sold-price context and cover several open-data sources in one place.";

export function formatPlanPrice(p: Plan): string {
  if (p.priceCad === 0) return "C$0";
  return `C$${p.priceCad}${p.interval === "month" ? "/mo" : p.interval === "year" ? "/yr" : ""}`;
}

export function effectiveMonthly(p: Plan): number | null {
  if (p.interval === "year") return Math.round((p.priceCad / 12) * 100) / 100;
  if (p.interval === "month") return p.priceCad;
  return null;
}

export function stripePriceId(p: Plan): string | null {
  return p.stripePriceEnv ? process.env[p.stripePriceEnv] || null : null;
}

export function planFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  return Object.values(PLANS).find((p) => stripePriceId(p) === priceId) ?? null;
}

export const PAID_PLAN_IDS: PlanId[] = ["pro_monthly", "pro_annual"];

/** Limits for a subscriptions row (tier + status). Inactive/unknown -> free. */
export function limitsFor(sub: { tier?: string | null; status?: string | null } | null) {
  const active = sub && ["active", "trialing"].includes(String(sub.status));
  return active && sub!.tier === "pro" ? PLANS.pro_monthly.limits : PLANS.free.limits;
}
