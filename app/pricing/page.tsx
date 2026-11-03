"use client";

import Link from "next/link";

type Plan = {
  id: "free" | "founder";
  name: string;
  price: string;
  priceNote?: string;
  features: string[];
  ctaLabel: string;
  href: string;
  highlight: boolean;
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "C$0",
    features: ["5 searches / day", "Preview guidance band", "1 saved search"],
    ctaLabel: "Start free",
    href: "/search",
    highlight: false,
  },
  {
    id: "founder",
    name: "Founder",
    price: "C$9",
    priceNote: "→ C$19/mo",
    features: [
      "Unlimited searches",
      "Full band + comps table",
      "Unlimited saves · in-app digest",
      "CSV export",
    ],
    ctaLabel: "Join waitlist",
    href: "/landing",
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-10 px-4 py-12">
      <div className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--sb-accent)]">
          Founder pricing
        </p>
        <h1 className="sb-title text-4xl text-[var(--sb-ink)]">Simple plans</h1>
        <p className="mx-auto max-w-xl text-[var(--sb-ink-soft)]">
          Live auctions stay on the official site — we link out. No fake scarcity, no contracts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col ${plan.highlight ? "border-[rgba(132,89,36,0.35)]" : ""}`}
          >
            <h2 className="sb-title text-xl text-[var(--sb-ink)]">{plan.name}</h2>
            <div className="sb-mono my-2.5 text-[32px] font-bold text-[var(--sb-ink)]">
              {plan.price}{" "}
              {plan.priceNote && (
                <span className="text-sm font-medium text-[var(--sb-muted)]">{plan.priceNote}</span>
              )}
            </div>
            <ul className="mb-5 flex-1 space-y-1.5 text-sm text-[var(--sb-ink-soft)]">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="relative pl-[18px] before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-[var(--sb-ok)]"
                >
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={`btn no-underline ${plan.highlight ? "btn-primary" : "btn-ghost text-[var(--sb-ink)]"}`}
            >
              {plan.ctaLabel}
            </Link>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-[var(--sb-muted)]">
        Prices in CAD. Founder rate rises to C$19/mo after the founding window. Cancel anytime.
      </p>
    </section>
  );
}
