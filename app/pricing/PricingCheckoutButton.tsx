"use client";
import { useState } from "react";

export default function PricingCheckoutButton({ plan }: { plan: "starter" | "pro" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    setNotConfigured(false);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.error === "checkout_not_configured") {
        setNotConfigured(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        className="w-full px-4 py-2 rounded bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition disabled:opacity-60"
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? "Loading..." : plan === "starter" ? "Start free trial" : "Get started"}
      </button>
      {notConfigured && (
        <div className="text-xs text-amber-400 mt-1">
          Checkout coming soon — contact us at hello@surplus-bus.com to get started.
        </div>
      )}
      {error && (
        <div className="text-xs text-red-400 mt-1">{error}</div>
      )}
    </div>
  );
}
