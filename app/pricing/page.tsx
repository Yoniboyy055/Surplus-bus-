
"use client";
import PricingCheckoutButton from "./PricingCheckoutButton";

type Plan = {
  id: "starter" | "pro";
  name: string;
  price: string;
  priceNote: string;
  tagline: string;
  features: string[];
  ctaLabel: string;
  highlight: boolean;
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    priceNote: "7-day trial",
    tagline: "Perfect for evaluating Surplus Bus before you commit.",
    features: [
      "50 tracked opportunities / month",
      "Daily alert digest",
      "30-day analytics history",
      "Government surplus sources (AB, BC, ON)",
      "Email support",
    ],
    ctaLabel: "Start free trial",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$299",
    priceNote: "/mo CAD",
    tagline: "For teams that need comprehensive coverage and real-time alerts.",
    features: [
      "Unlimited tracked opportunities",
      "Real-time alerts (instant push + email)",
      "90-day analytics + CSV exports",
      "All Canadian government sources",
      "Priority support + onboarding call",
    ],
    ctaLabel: "Get started",
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <section className="max-w-5xl mx-auto py-16 space-y-12">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Pricing</p>
        <h1 className="text-4xl font-bold text-quantum-50">Simple, transparent plans</h1>
        <p className="text-quantum-400 max-w-xl mx-auto">
          Start free. Upgrade when you&apos;re ready. No contracts, no surprises.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-xl p-6 flex flex-col border transition ${
              plan.highlight
                ? "border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-500/10"
                : "border-quantum-700 bg-quantum-900/60"
            }`}
          >
            {plan.highlight && (
              <div className="mb-4">
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-cyan-500/15 text-cyan-300 border-cyan-500/40 uppercase tracking-wider font-medium">
                  Most popular
                </span>
              </div>
            )}
            <h2 className="text-xl font-bold text-quantum-50">{plan.name}</h2>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-cyan-300">{plan.price}</span>
              <span className="text-sm text-quantum-400">{plan.priceNote}</span>
            </div>
            <p className="mt-2 text-sm text-quantum-400">{plan.tagline}</p>
            <ul className="mt-5 space-y-2.5 text-sm text-quantum-200 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <PricingCheckoutButton plan={plan.id} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-quantum-600">
        Information service only. Not a broker. Prices in CAD. Subject to change.
      </p>
    </section>
  );
}
