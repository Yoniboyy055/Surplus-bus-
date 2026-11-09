"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle, Link2, ListFilter, Shield } from "lucide-react";
import { WAITLIST_CONSENT_TEXT } from "@/lib/account/schemas";

const CONSENT_TEXT = WAITLIST_CONSENT_TEXT;

const FEATURES = [
  {
    icon: <Shield className="text-[var(--sb-action)]" size={28} />,
    title: "Public sources only",
    desc: "Official government surplus and open-data sold packs. We name sources and licence them.",
  },
  {
    icon: <ListFilter className="text-[var(--sb-action)]" size={28} />,
    title: "Guidance band, not a guess",
    desc: "See p25–p75 from similar closed lots when n ≥ 20 — then open the official listing.",
  },
  {
    icon: <Link2 className="text-[var(--sb-action)]" size={28} />,
    title: "You act on the official site",
    desc: "We link out. We don't place bids or run a deal desk.",
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!consent) {
      setError("Tick the consent box to join the waitlist.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/beta-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          marketing_consent: true,
          consent_text: CONSENT_TEXT,
        }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || "We couldn't join you just now. Please try again in a minute.";
        setError(msg);
        setStatus("error");
      }
    } catch {
      setError("We couldn't join you just now. Please try again in a minute.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-14 text-center">
        <span className="chip mb-4">Founder waitlist · CASL consent</span>
        <h1 className="sb-display max-w-[18ch] text-[clamp(32px,5vw,48px)] text-[var(--sb-ink)]">
          Know the sold range before you bid
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--sb-ink-soft)]">
          Surplus Bus indexes closed Canadian government surplus lots and shows a guidance band from
          real sold prices. Information only — we never bid, broker, or take a cut.
        </p>

        {status === "success" ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <CheckCircle className="text-[var(--sb-ok-text)]" size={32} />
            <span className="text-lg font-semibold text-[var(--sb-ok-text)]">You&apos;re on the list</span>
            <p className="max-w-md text-sm text-[var(--sb-ink-soft)]">
              Thanks — we&apos;ll email you when a Founder spot opens.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link href="/search" className="btn btn-primary no-underline">
                Try a search
              </Link>
              <Link href="/pricing" className="btn btn-ghost no-underline text-[var(--sb-ink)]">
                See pricing
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card mt-8 w-full max-w-md space-y-3 text-left">
            <label className="block text-sm text-[var(--sb-ink-soft)]" htmlFor="waitlist-email">
              Work email
            </label>
            <input
              id="waitlist-email"
              type="email"
              required
              className="w-full"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
            />
            <label className="flex items-start gap-3 text-sm text-[var(--sb-ink-soft)]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />
              <span>{CONSENT_TEXT}</span>
            </label>
            <button type="submit" className="btn btn-primary w-full" disabled={status === "loading"}>
              {status === "loading" ? "Joining…" : "Join waitlist"}
            </button>
            <p className="text-[11px] leading-relaxed text-[var(--sb-muted)]">
              See our{" "}
              <Link href="/legal/privacy" className="underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/legal/anti-spam" className="underline">
                Anti-spam policy
              </Link>
              . Surplus Bus by YK+ Systems · Ontario, Canada.
            </p>
          </form>
        )}
        {status === "error" && error && (
          <div className="mt-3 text-sm text-[var(--sb-danger-text)]" role="alert">
            {error}
          </div>
        )}
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 pb-16 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card flex flex-col items-center gap-3 text-center">
            <div>{f.icon}</div>
            <h3 className="sb-title text-lg text-[var(--sb-ink)]">{f.title}</h3>
            <p className="text-sm text-[var(--sb-muted)]">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
