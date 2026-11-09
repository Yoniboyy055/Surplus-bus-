import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { PLANS, stripePriceId } from "@/lib/billing/plans";
import { stripeConfigured, stripePost } from "@/lib/billing/stripe";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { siteUrl } from "@/lib/email/unsubscribe";

const body = z.object({ plan: z.enum(["pro_monthly", "pro_annual"]) });

/** Creates a Stripe Checkout Session (subscription) for the signed-in user. */
export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "billing-checkout", 10, 60_000);
  if (limited) return limited;
  const { user, error } = await requireUser();
  if (error || !user) return error!;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  const plan = PLANS[parsed.data.plan];
  const price = stripePriceId(plan);
  if (!stripeConfigured() || !price) {
    return NextResponse.json(
      { error: "checkout_not_configured", message: "Checkout isn't switched on yet. Join the waitlist and we'll let you know." },
      { status: 503 }
    );
  }
  try {
    const session = await stripePost<{ id: string; url: string }>("checkout/sessions", {
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": 1,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      "metadata[profile_id]": user.id,
      "metadata[plan_id]": plan.id,
      "subscription_data[metadata][profile_id]": user.id,
      "subscription_data[metadata][plan_id]": plan.id,
      allow_promotion_codes: "true",
      "automatic_tax[enabled]": process.env.STRIPE_AUTOMATIC_TAX === "1" ? "true" : undefined,
      success_url: `${siteUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/billing/cancel`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[billing] checkout failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "checkout_failed", message: "Checkout is unavailable right now." }, { status: 502 });
  }
}
