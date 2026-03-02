"use client";

import { useState } from "react";

type Plan = {
  id: "starter" | "pro";
  name: string;
  monthly_price_cad: number;
  features: string[];
  checkout_enabled: boolean;
};

export default function PricingPage() {
  const [email, setEmail] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plans: Plan[] = [
    {
      id: "starter",
      name: "Starter",
      monthly_price_cad: 99,
      checkout_enabled: true,
      features: ["50 tracked opportunities/month", "Daily alerts", "30-day analytics"],
    },
    {
      id: "pro",
      name: "Pro",
      monthly_price_cad: 299,
      checkout_enabled: true,
      features: ["Unlimited tracked opportunities", "Instant alerts", "90-day analytics + exports"],
    },
  ];

  const startCheckout = async (plan: Plan) => {
    setError(null);
    setLoadingPlan(plan.id);

    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id, email: email || undefined }),
      });

      const json = await res.json();
      if (!res.ok || !json.checkout_url) {
        setError(json.message || json.error || "Unable to open checkout.");
        setLoadingPlan(null);
        return;
      }

      window.location.href = json.checkout_url;
    } catch {
      setError("Network error while starting checkout.");
      setLoadingPlan(null);
    }
  };

  return (
    <section className="max-w-5xl mx-auto py-16 space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold">Pay now. Start now.</h1>
        <p className="text-quantum-300">Choose a plan, complete checkout, and activate your Surplus Bus workspace immediately.</p>
      </div>

      <div className="max-w-xl mx-auto bg-quantum-900 border border-quantum-700 rounded-xl p-4">
        <label className="text-sm text-quantum-300 block mb-2">Work email (pre-fills checkout)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full bg-quantum-950 border border-quantum-700 rounded px-4 py-3"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className={`rounded-xl p-6 flex flex-col border ${plan.id === "pro" ? "border-cyan-500/50 bg-cyan-950/20" : "border-quantum-700 bg-quantum-900/40"}`}>
            <h2 className="text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-3xl font-bold text-cyan-300">${plan.monthly_price_cad}<span className="text-sm text-quantum-400">/mo CAD</span></p>
            <ul className="mt-4 text-sm space-y-2 text-quantum-200 flex-1">
              {plan.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout(plan)}
              disabled={loadingPlan !== null || !plan.checkout_enabled}
              className="mt-6 w-full text-center bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-quantum-950 font-semibold rounded-full px-4 py-3 transition-colors"
            >
              {loadingPlan === plan.id ? "Redirecting to secure checkout…" : "Pay now & start"}
            </button>
          </div>
        ))}
      </div>

      {error ? <p className="text-center text-red-400 text-sm">{error}</p> : null}
    </section>
  );
}
