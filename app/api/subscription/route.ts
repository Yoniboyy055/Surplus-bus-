import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { CURRENCY, PAID_PLAN_IDS, PLANS, stripePriceId } from "@/lib/billing/plans";
import { stripeConfigured } from "@/lib/billing/stripe";

/** Public plan metadata, read from lib/billing/plans.ts (same source as the UI). */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, "subscription-get", 60, 60_000);
  if (limited) return limited;
  const plans = Object.values(PLANS).map((p) => ({
    id: p.id,
    name: p.name,
    tier: p.tier,
    price_cad: p.priceCad,
    interval: p.interval,
    features: p.features,
    limits: p.limits,
    checkout_enabled: p.tier === "pro" && stripeConfigured() && Boolean(stripePriceId(p)),
  }));
  return NextResponse.json({
    ok: true,
    currency: CURRENCY,
    self_serve_enabled: plans.some((p) => PAID_PLAN_IDS.includes(p.id) && p.checkout_enabled),
    plans,
  });
}
