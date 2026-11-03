"use client";

import Link from "next/link";
import { SOURCE_REGISTRY } from "@/lib/sources/modes";

export default function DemoDashboardClient() {
  const officialOnly = SOURCE_REGISTRY.filter((s) => s.mode === "official_site_only");
  const hooks = SOURCE_REGISTRY.filter((s) => s.mode === "hook_pending");

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-10 px-4">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Surplus Bus beta
        </p>
        <h1 className="text-3xl font-bold text-quantum-50">Demo</h1>
        <p className="text-quantum-300 max-w-2xl">
          Surplus Bus ranks public Canadian government surplus listings and links you to the
          official page. We never bid, broker, or take a cut. Licensed open-data feeds are wired for tenders and price history. Auction hosts without a reuse licence stay link-out only — no invented listings.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/sources"
            className="inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-quantum-950 hover:bg-cyan-400"
          >
            View sources
          </Link>
          <Link
            href="/landing"
            className="inline-flex items-center rounded-lg border border-quantum-600 px-4 py-2 text-sm font-medium text-quantum-100 hover:border-cyan-500/50"
          >
            Join the waitlist
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-5 space-y-2">
        <div className="inline-flex items-center rounded-full border border-amber-500/50 px-2.5 py-0.5 text-xs font-medium text-amber-300">
          Official site only
        </div>
        <h2 className="text-lg font-semibold text-quantum-50">No listings in the feed yet</h2>
        <p className="text-sm text-quantum-300">
          Placeholder parsers and mock rows were removed. Until an approved ingest path is live,
          open each official site below to see current lots. Ranked feed, scoring, and in-app
          inbox alerts will use real data only.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-quantum-700 bg-quantum-900/60 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-quantum-100">Link-out sources</h2>
          <p className="text-xs text-quantum-400">
            We can&apos;t list these sites&apos; lots here yet. Open the official site.
          </p>
          <ul className="space-y-2">
            {officialOnly.map((s) => (
              <li key={s.parserKey} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-quantum-200">{s.name}</span>
                <a
                  href={s.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 shrink-0"
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-quantum-700 bg-quantum-900/60 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-quantum-100">Open-data feeds</h2>
          <p className="text-xs text-quantum-400">
            CanadaBuys open CSV + GCSurplus/NS sold history under OGL. See Watchlist, Price history, Tenders.
          </p>
          <ul className="space-y-2">
            {hooks.map((s) => (
              <li key={s.parserKey} className="text-sm text-quantum-200">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-quantum-400">{s.honesty}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-quantum-700 bg-quantum-900/60 p-5 space-y-2">
        <h2 className="text-sm font-semibold text-quantum-100">What ranking will look like</h2>
        <p className="text-sm text-quantum-300">
          One scheduled scorer filters out closed listings, then weights fit 40, time to act 25,
          value 20, data quality 10, freshness 5 — with a &quot;why this ranked&quot; explanation.
          Alerts go to the in-app inbox only (no email alerts in this phase).
        </p>
      </div>
    </div>
  );
}
