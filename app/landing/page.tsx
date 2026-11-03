"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle, Link2, ListFilter, Shield } from "lucide-react";

const CONSENT_TEXT =
  "Yes, YK+ Systems may email me when Surplus Bus beta access opens, plus occasional Surplus Bus product updates. I can unsubscribe anytime.";

const FEATURES = [
  {
    icon: <Shield className="text-cyan-400" size={28} />,
    title: "Public sources only",
    desc: "Official government surplus and procurement listings. We name sources once they pull real lots.",
  },
  {
    icon: <ListFilter className="text-cyan-400" size={28} />,
    title: "Ranked for you",
    desc: "Filter by category, region, and value so you spend time on listings worth opening.",
  },
  {
    icon: <Link2 className="text-cyan-400" size={28} />,
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
    <div className="min-h-screen bg-[var(--sb-bg)] text-[var(--sb-text)] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <span className="font-bold text-xl tracking-tight text-[var(--sb-accent)]">Surplus Bus</span>
        <div className="flex gap-6 items-center text-[var(--sb-text-muted)] text-sm">
          <Link href="/product" className="hover:text-[var(--sb-accent)]">Product</Link>
          <Link href="/pricing" className="hover:text-[var(--sb-accent)]">Pricing</Link>
          <Link href="/faq" className="hover:text-[var(--sb-accent)]">FAQ</Link>
          <Link
            href="/auth"
            className="ml-2 px-4 py-2 rounded-lg bg-[var(--sb-accent)] text-[var(--sb-text-inverse)] font-semibold hover:bg-[var(--sb-accent-hover)] active:scale-[0.97]"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <section className="flex flex-col items-center justify-center flex-1 py-16 px-4">
        <div className="max-w-3xl w-full text-center space-y-6">
          <span className="inline-block px-3 py-1 rounded-full border border-[var(--sb-accent-border)] bg-[var(--sb-accent-subtle)] text-[var(--sb-accent)] text-xs font-semibold tracking-wider">
            Public beta · limited access
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
            Public-sector surplus opportunities, organised before you chase them by hand
          </h1>
          <p className="text-[var(--sb-text-secondary)] text-lg max-w-2xl mx-auto">
            Surplus Bus watches Canadian government surplus and related public listings, ranks what
            matches your criteria, and points you to the official source. Information only — we never
            bid, broker, or take a cut.
          </p>

          {status === "success" ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <CheckCircle className="text-[var(--sb-success)] mb-2" size={32} />
              <span className="text-[var(--sb-success)] font-semibold text-lg">You&apos;re on the list</span>
              <p className="text-[var(--sb-text-secondary)] text-sm max-w-md">
                Thanks — we&apos;ll email you at this address when a beta spot opens. Meanwhile you can
                read how Surplus Bus works.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-lg bg-[var(--sb-accent)] text-[var(--sb-text-inverse)] font-semibold"
                >
                  See pricing
                </Link>
                <Link
                  href="/product"
                  className="px-4 py-2 rounded-lg border border-[var(--sb-border)] text-[var(--sb-accent)] font-semibold"
                >
                  How it works
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-4 w-full space-y-3 text-left">
              <label className="block text-sm text-[var(--sb-text-secondary)]" htmlFor="waitlist-email">
                Work email
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--sb-border)] bg-[var(--sb-surface)] text-[var(--sb-text)] placeholder:text-[var(--sb-text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--sb-accent)]"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                aria-describedby="waitlist-email-help"
              />
              <p id="waitlist-email-help" className="text-xs text-[var(--sb-text-muted)]">
                We&apos;ll email you when a beta spot opens. No spam.
              </p>
              <label className="flex items-start gap-3 text-sm text-[var(--sb-text-secondary)]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
                <span>
                  <span className="text-[var(--sb-warning)]">(Required)</span> {CONSENT_TEXT}
                </span>
              </label>
              <button
                type="submit"
                className="w-full px-6 py-3 rounded-lg bg-[var(--sb-accent)] text-[var(--sb-text-inverse)] font-semibold hover:bg-[var(--sb-accent-hover)] active:scale-[0.97] disabled:opacity-60"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Joining…" : "Join the waitlist"}
              </button>
              <p className="text-[11px] text-[var(--sb-text-muted)] leading-relaxed">
                We&apos;ll use this email only to manage your Surplus Bus waitlist request and any updates
                you opted into. See our{" "}
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
            <div className="text-[var(--sb-danger)] text-sm mt-2" role="alert">
              {error}
            </div>
          )}
        </div>
      </section>

      <section className="w-full border-y border-[var(--sb-border)] py-3 bg-[var(--sb-bg-elevated)]">
        <p className="text-center text-xs font-semibold tracking-wider text-[var(--sb-text-muted)] uppercase">
          Beta · invitation only · information service
        </p>
      </section>

      <section className="max-w-5xl mx-auto py-16 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[var(--sb-border)] bg-[var(--sb-surface)] p-7 flex flex-col items-center text-center gap-4"
            >
              <div>{f.icon}</div>
              <h3 className="font-semibold text-lg text-[var(--sb-accent)]">{f.title}</h3>
              <p className="text-[var(--sb-text-muted)] text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
