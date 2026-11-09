"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = [
  { id: "vehicles-pickup", label: "Vehicles · pickup / light truck", note: "See what similar lots sold for" },
  { id: "heavy-trucks", label: "Heavy equipment · trucks", note: "See what similar lots sold for" },
  { id: "electronics", label: "Electronics · IT equipment", note: "See what similar lots sold for" },
  { id: "office", label: "Office furniture · chairs", note: "See what similar lots sold for" },
];

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    // Direct to comps when a clear query is entered (mindful clicks: skip list hop).
    router.push(`/comps?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-0">
      <div>
        <h1 className="sb-title text-[26px] text-[var(--sb-ink)]">Search</h1>
        <p className="text-sm text-[var(--sb-muted)]">
          Optional — only when the query matches several categories
        </p>
      </div>

      <form
        onSubmit={onSearch}
        className="flex max-w-[720px] items-center gap-2.5 rounded-full border border-[var(--sb-line)] bg-[var(--sb-surface-raised)] py-2 pl-[22px] pr-2 shadow-raised"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search sold surplus"
          className="min-w-0 flex-1 border-0 bg-transparent px-0 py-3 shadow-none focus:ring-0"
          placeholder="truck, chair, laptop…"
        />
        <button type="submit" className="btn btn-primary shrink-0">
          Search
        </button>
      </form>

      <p className="text-sm text-[var(--sb-muted)]">Pick a category to open guidance</p>
      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/comps?q=${encodeURIComponent((c.label.split("·")[0] ?? c.label).trim())}&cat=${c.id}`}
            className="card block no-underline hover:shadow-raised"
          >
            <strong className="text-[var(--sb-ink)]">{c.label}</strong>
            <div className="mt-1.5 text-sm text-[var(--sb-muted)]">{c.note}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
