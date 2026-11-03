"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const STATS = [
  { label: "sold lots indexed", value: "84,995" },
  { label: "vehicle lots", value: "5,988" },
  { label: "electronics lots", value: "2,852" },
];

export default function HomePage() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/comps?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <>
      <section className="mx-auto max-w-[1100px] px-5 pb-16 pt-6 text-center md:px-10">
        <div className="relative mx-auto mb-7 max-w-[920px] overflow-hidden rounded-[32px] shadow-raised bg-[var(--sb-surface)]">
          <Image
            src="/images/hero_surplus_still_life.jpg"
            alt="ILLUSTRATIVE soft 3D surplus still life"
            width={1840}
            height={920}
            className="h-auto w-full"
            priority
          />
          <span className="absolute right-3 top-3 rounded-full bg-[var(--sb-ink)] px-2.5 py-1 text-[10px] font-bold tracking-wider text-[var(--sb-bg)]">
            ILLUSTRATIVE
          </span>
        </div>

        <p className="chip mx-auto">Canadian government surplus · sold-price guidance</p>
        <h1 className="sb-display mx-auto mt-4 max-w-[16ch] text-[clamp(32px,5vw,48px)] text-[var(--sb-ink)]">
          Know the sold range before you bid
        </h1>
        <p className="mx-auto mt-3.5 max-w-[42ch] text-lg text-[var(--sb-ink-soft)]">
          Search closed Canadian government surplus lots. See a guidance band from real sold prices —
          then open the official listing.
        </p>

        <form
          onSubmit={onSearch}
          className="mx-auto mt-7 flex max-w-[640px] items-center gap-2.5 rounded-full border border-[var(--sb-line)] bg-[var(--sb-surface-raised)] py-2 pl-[22px] pr-2 shadow-raised"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Try “pickup truck” or “office chair”'
            aria-label="Search sold surplus"
            className="min-w-0 flex-1 border-0 bg-transparent px-0 py-3 text-base text-[var(--sb-ink)] shadow-none focus:ring-0"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Search
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          {STATS.map((s) => (
            <span key={s.label} className="chip">
              <strong>{s.value}</strong> {s.label}
            </span>
          ))}
          <span className="chip">OGL–Canada</span>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-5 pb-16 md:px-10">
        <h2 className="sb-title text-[28px] text-[var(--sb-ink)]">Founder pricing</h2>
        <p className="mb-6 text-[var(--sb-ink-soft)]">
          Simple plans. Live auctions stay on the official site — we link out.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <h3 className="sb-title text-xl">Free</h3>
            <div className="sb-mono my-2.5 text-[32px] font-bold text-[var(--sb-ink)]">C$0</div>
            <ul className="mb-5 space-y-1.5 text-sm text-[var(--sb-ink-soft)]">
              {["5 searches / day", "Preview guidance band", "1 saved search"].map((f) => (
                <li key={f} className="relative pl-[18px] before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-[var(--sb-ok)]">
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/search" className="btn btn-ghost no-underline text-[var(--sb-ink)]">
              Start free
            </Link>
          </div>
          <div className="card border-[rgba(132,89,36,0.35)]">
            <h3 className="sb-title text-xl">Founder</h3>
            <div className="sb-mono my-2.5 text-[32px] font-bold text-[var(--sb-ink)]">
              C$9{" "}
              <span className="text-sm font-medium text-[var(--sb-muted)]">→ C$19/mo</span>
            </div>
            <ul className="mb-5 space-y-1.5 text-sm text-[var(--sb-ink-soft)]">
              {[
                "Unlimited searches",
                "Full band + comps table",
                "Unlimited saves · in-app digest",
                "CSV export",
              ].map((f) => (
                <li key={f} className="relative pl-[18px] before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-[var(--sb-ok)]">
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/landing" className="btn btn-primary no-underline">
              Join waitlist
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
