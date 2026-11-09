import { PlanCards } from "@/components/PlanCards";
import { PAID_PLAN_IDS, PLANS, stripePriceId } from "@/lib/billing/plans";
import { stripeConfigured } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing — Surplus Bus", description: "Simple plans in Canadian dollars." };

export default function PricingPage() {
  const checkoutEnabled = stripeConfigured() && PAID_PLAN_IDS.every((id) => Boolean(stripePriceId(PLANS[id])));
  return (
    <section className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--sb-accent-700)]">Pricing</p>
        <h1 className="sb-title text-4xl text-[var(--sb-ink)]">Simple plans</h1>
        <p className="mx-auto max-w-xl text-[var(--sb-ink-soft)]">
          Live auctions stay on the official sites — we link out. No fake scarcity, no contracts.
        </p>
      </div>
      <PlanCards checkoutEnabled={checkoutEnabled} />
    </section>
  );
}
