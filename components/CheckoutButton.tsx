"use client";

import { useState } from "react";

export function CheckoutButton({ plan, label, variant = "primary" }: { plan: "pro_monthly" | "pro_annual"; label: string; variant?: "primary" | "outline" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    if (res.status === 401) {
      window.location.href = `/auth?callbackUrl=${encodeURIComponent("/pricing")}`;
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.url) {
      window.location.href = body.url;
      return;
    }
    setErr(body.message || "Checkout is unavailable right now.");
    setBusy(false);
  }
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={go} disabled={busy} className={`btn ${variant === "primary" ? "btn-primary" : "btn-outline"}`}>
        {busy ? "Opening checkout…" : label}
      </button>
      {err && <span role="alert" className="mt-1 text-xs text-[var(--sb-danger)]">{err}</span>}
    </span>
  );
}
