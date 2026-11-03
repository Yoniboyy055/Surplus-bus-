"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LicenceAttribution } from "@/components/LicenceAttribution";
import { OGL_CANADA } from "@/lib/opendata/attribution";
import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";

const SAMPLE_ROWS = [
  { title: "Light truck · Ottawa region", sold: 8100, date: "2025-09-12", url: "https://www.gcsurplus.ca/" },
  { title: "Crew cab · prairie depot", sold: 11250, date: "2025-06-03", url: "https://www.gcsurplus.ca/" },
  { title: "Cargo van · GTA", sold: 5400, date: "2024-11-28", url: "https://www.gcsurplus.ca/" },
];

function money(n: number) {
  return `C$${n.toLocaleString("en-CA")}`;
}

function CompsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") || "pickup truck";
  const state = params.get("state"); // empty | error | low | stale | paywall
  const [savedToast, setSavedToast] = useState(false);
  const [digestOff, setDigestOff] = useState(false);

  const n = state === "low" ? 7 : state === "empty" ? 0 : 128;
  const asOf = state === "stale" ? "2025-02-01" : "2025-12-30";
  const showBand = n >= 20 && state !== "empty" && state !== "error" && state !== "paywall";
  const isStale = state === "stale";

  const title = useMemo(() => `${q} · sold comps`, [q]);

  function saveSearch() {
    setSavedToast(true);
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="banner danger">Something went wrong loading sold data. Your saves are safe.</div>
        <h1 className="sb-title text-[26px] mb-2">Couldn’t load comps</h1>
        <p className="text-sm text-[var(--sb-muted)] mb-5">
          Try again. If it keeps happening, check back after the next pack refresh.
        </p>
        <Button onClick={() => router.refresh()}>Try again</Button>
      </div>
    );
  }

  if (state === "empty" || n === 0) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="relative mx-auto mb-5 h-[200px] w-[280px] overflow-hidden rounded-[20px] shadow-raised">
          <Image src="/images/empty_crate.jpg" alt="ILLUSTRATIVE empty crate" fill className="object-cover" />
          <span className="absolute right-2 top-2 rounded-full bg-[var(--sb-ink)] px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--sb-bg)]">
            ILLUSTRATIVE
          </span>
        </div>
        <h1 className="sb-title text-[26px] mb-2">No sold comps yet</h1>
        <p className="text-sm text-[var(--sb-muted)] mb-5">
          Try a broader category, or check spelling. We only show real closed lots from the OGL pack.
        </p>
        <Link href="/search" className="btn btn-primary no-underline">
          Edit search
        </Link>
      </div>
    );
  }

  if (state === "paywall") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="sb-title text-[26px]">{q} · guidance</h1>
          <p className="text-sm text-[var(--sb-muted)]">Free limit reached for today</p>
        </div>
        <div className="card mx-auto max-w-[560px] text-center">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent)]">
            Unlock full guidance
          </div>
          <h2 className="sb-title text-[28px] mb-2">Founder · C$9 → C$19/mo</h2>
          <p className="text-sm text-[var(--sb-muted)] mb-5">
            Unlimited searches, full band + comps, saves, in-app digest, CSV. No fake scarcity.
          </p>
          <Link href="/landing" className="btn btn-primary no-underline">
            Unlock guidance
          </Link>
          <div className="mt-3">
            <Link href={`/comps?q=${encodeURIComponent(q)}`} className="btn btn-ghost no-underline text-[var(--sb-ink)]">
              Continue with Free preview
            </Link>
          </div>
          <details className="mt-5 text-left text-sm text-[var(--sb-ink-soft)]">
            <summary>What’s included</summary>
            <ul className="mt-2.5 ml-4 list-disc">
              <li>Full p25–p75 band when n ≥ 20</li>
              <li>Compact comps table + official link-outs</li>
              <li>Unlimited saved searches · in-app digest</li>
            </ul>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-0">
      {isStale && (
        <div className="banner">
          Data pack is older than ~8 months. Treat the band as historical context until the next refresh.
        </div>
      )}
      {state === "low" && (
        <div className="banner">
          Sample too small for a guidance band (n &lt; 20). Showing individual sold rows only.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="sb-title text-[26px] text-[var(--sb-ink)]">{title}</h1>
          <p className="text-sm text-[var(--sb-muted)]">
            As of {asOf} · pack refreshed ~6-monthly · OGL–Canada
          </p>
        </div>
        <Button onClick={saveSearch}>Save this search</Button>
      </div>

      {showBand && (
        <div className="grid items-center gap-5 md:grid-cols-[1.1fr_1fr]">
          <div className="relative overflow-hidden rounded-[30px] shadow-raised bg-[var(--sb-surface)]">
            <Image
              src="/images/price_range_tags.jpg"
              alt="ILLUSTRATIVE tactile price tags"
              width={1200}
              height={900}
              className="h-auto w-full"
            />
            <span className="absolute right-3 top-3 rounded-full bg-[var(--sb-ink)] px-2.5 py-1 text-[10px] font-bold tracking-wider text-[var(--sb-bg)]">
              ILLUSTRATIVE
            </span>
          </div>
          <div className="card">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent)]">
              Guidance band · not a guarantee
            </div>
            <div className="sb-title mb-1.5 text-[22px]">Typical sold range</div>
            <p className="mb-4 text-sm text-[var(--sb-ink-soft)]">
              p25–p75 from similar closed lots. Advice only — not an appraisal. Live auctions: view the
              official listing.
            </p>
            <div className="guidance-band motion-band">
              <div className="guidance-band-fill" />
              <div className="guidance-band-tick" />
            </div>
            <div className="mt-2.5 flex justify-between text-sm text-[var(--sb-ink-soft)]">
              <span>
                p25 <strong className="sb-mono text-[var(--sb-ink)]">C$4,200</strong>
              </span>
              <span>
                median <strong className="sb-mono text-[var(--sb-ink)]">C$7,850</strong>
              </span>
              <span>
                p75 <strong className="sb-mono text-[var(--sb-ink)]">C$12,400</strong>
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <span className="chip">
                <strong className="sb-mono">n = {n}</strong> sold comps
              </span>
              <span className="chip">
                As of <strong>{asOf}</strong>
              </span>
              <span className="chip">OGL–Canada</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button onClick={saveSearch}>Save this search</Button>
              <Link href="/search" className="btn btn-outline no-underline text-[var(--sb-ink)]">
                Refine
              </Link>
            </div>
          </div>
        </div>
      )}

      {!showBand && state === "low" && (
        <div className="flex flex-wrap gap-2.5">
          <span className="chip">
            <strong className="sb-mono">n = {n}</strong>
          </span>
          <span className="chip">Band hidden</span>
        </div>
      )}

      <div className="card">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent)]">
          Sold-price trend · ILLUSTRATIVE
        </div>
        <svg viewBox="0 0 640 140" width="100%" height="140" role="img" aria-label="ILLUSTRATIVE trend">
          <path
            className="motion-draw"
            d="M20,110 C80,105 120,90 180,95 C240,100 280,70 340,65 C400,60 460,80 520,55 C560,42 600,50 620,40"
            fill="none"
            stroke="#99503D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="620" cy="40" r="5" fill="#845924" />
        </svg>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--sb-line)] text-left text-xs uppercase tracking-wider text-[var(--sb-muted)]">
              <th className="px-2 py-2.5 font-medium">Lot (sample)</th>
              <th className="px-2 py-2.5 font-medium">Sold</th>
              <th className="px-2 py-2.5 font-medium">Date</th>
              <th className="px-2 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ROWS.map((r) => (
              <tr key={r.title} className="border-b border-[var(--sb-line)]">
                <td className="px-2 py-3.5 text-[var(--sb-ink)]">
                  {r.title} <span className="text-[var(--sb-muted)]">ILLUSTRATIVE</span>
                </td>
                <td className="px-2 py-3.5 sb-mono font-bold text-[var(--sb-ink)]">{money(r.sold)}</td>
                <td className="px-2 py-3.5 text-[var(--sb-ink-soft)]">{r.date}</td>
                <td className="px-2 py-3.5">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline !px-3.5 !py-2 text-[13px] no-underline text-[var(--sb-ink)]"
                  >
                    View official listing ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 space-y-1">
          <LicenceAttribution licence={OGL_CANADA} />
          <p className="text-xs text-[var(--sb-muted)]">Sample rows ILLUSTRATIVE.</p>
        </div>
      </div>

      {!digestOff && (
        <p className="text-sm text-[var(--sb-muted)]">
          <Link href="/search" className="text-[var(--sb-accent)]">
            Add a 2nd saved search
          </Link>{" "}
          · optional ·{" "}
          <button type="button" className="underline" onClick={() => setDigestOff(true)}>
            Dismiss
          </button>
        </p>
      )}

      {savedToast && (
        <Toast message="Search saved. You’ll see new sold matches in Digest." type="success" onClose={() => setSavedToast(false)} />
      )}
    </div>
  );
}

export default function CompsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--sb-muted)]">Loading comps…</div>}>
      <CompsInner />
    </Suspense>
  );
}
