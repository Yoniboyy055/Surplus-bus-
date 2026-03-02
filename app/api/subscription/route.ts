import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rateLimit";

type PlanId = "starter" | "pro";

type PlanConfig = {
  id: PlanId;
  name: string;
  monthly_price_cad: number;
  checkout_url: string | null;
  features: string[];
};

function getPlans(): PlanConfig[] {
  return [
    {
      id: "starter",
      name: "Starter",
      monthly_price_cad: 99,
      checkout_url: process.env.STRIPE_PAYMENT_LINK_STARTER ?? null,
      features: ["50 tracked opportunities/month", "Daily alerts", "30-day analytics"],
    },
    {
      id: "pro",
      name: "Pro",
      monthly_price_cad: 299,
      checkout_url: process.env.STRIPE_PAYMENT_LINK_PRO ?? null,
      features: ["Unlimited tracked opportunities", "Instant alerts", "90-day analytics + exports"],
    },
  ];
}

/**
 * Billing/subscription API for self-serve checkout.
 * - GET: public plan metadata + checkout availability
 * - POST: returns checkout URL for selected plan
 */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, "subscription-get", 60, 60_000);
  if (limited) return limited;

  const plans = getPlans().map((plan) => ({
    id: plan.id,
    name: plan.name,
    monthly_price_cad: plan.monthly_price_cad,
    features: plan.features,
    checkout_enabled: Boolean(plan.checkout_url),
  }));

  return NextResponse.json({
    ok: true,
    self_serve_enabled: plans.some((p) => p.checkout_enabled),
    plans,
  });
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "subscription-post", 20, 60_000);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as { plan?: unknown; email?: unknown } | null;
  const planId = typeof body?.plan === "string" ? body.plan : undefined;
  const email = typeof body?.email === "string" ? body.email.trim() : undefined;

  if (planId !== "starter" && planId !== "pro") {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const plan = getPlans().find((p) => p.id === planId);
  if (!plan?.checkout_url) {
    return NextResponse.json(
      {
        error: "checkout_not_configured",
        message: "Set STRIPE_PAYMENT_LINK_STARTER / STRIPE_PAYMENT_LINK_PRO to enable self-serve checkout.",
      },
      { status: 503 },
    );
  }

  const url = new URL(plan.checkout_url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://surplus-bus.vercel.app";

  url.searchParams.set("client_reference_id", plan.id);
  url.searchParams.set("redirect_status", "succeeded");
  url.searchParams.set("success_url", `${appUrl}/billing/success?plan=${encodeURIComponent(plan.id)}`);
  url.searchParams.set("cancel_url", `${appUrl}/billing/cancel?plan=${encodeURIComponent(plan.id)}`);
  if (email) url.searchParams.set("prefilled_email", email);

  return NextResponse.json({ ok: true, checkout_url: url.toString(), plan: plan.id });
}
