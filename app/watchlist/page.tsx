"use client";

import Link from "next/link";
import { ExternalLink, Eye } from "lucide-react";
import { useState } from "react";
import { SURPLUS_WATCHLIST } from "@/lib/opendata/watchlist";
import { SourceStatusBadge } from "@/components/SourceStatusBadge";
import { Button } from "@/components/Button";
import { Toast } from "@/components/Toast";

export default function WatchlistPage() {
  const [dismissNudge, setDismissNudge] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saved] = useState([{ id: "1", query: "pickup truck", n: 128, last: "ILLUSTRATIVE" }]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="sb-title text-[26px] text-[var(--sb-ink)]">Saved &amp; watchlist</h1>
          <p className="max-w-2xl text-sm text-[var(--sb-ink-soft)]">
            Your investments — make the next visit more useful. Official sites below stay link-out only
            where scrape/reuse is not licensed.
          </p>
        </div>
        <Link href="/search" className="btn btn-primary no-underline">
          New search
        </Link>
      </div>

      <div className="banner ok">
        Digest is On · in-app only · fires when genuinely new sold data matches
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {saved.map((s) => (
          <div key={s.id} className="card">
            <strong className="text-[var(--sb-ink)]">{s.query}</strong>
            <div className="mt-1.5 text-sm text-[var(--sb-muted)]">
              Saved search · last new sold: {s.last} · n was {s.n}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/comps?q=${encodeURIComponent(s.query)}`} className="btn btn-primary !py-2.5 !px-4 no-underline">
                Review comps
              </Link>
              <Button variant="ghost" className="!py-2.5 !px-4" onClick={() => setToast("Rename in a later pass — auto-named from query for now.")}>
                Rename
              </Button>
              <Button variant="ghost" className="!py-2.5 !px-4" onClick={() => setToast("Delete confirmed locally (demo).")}>
                Delete
              </Button>
            </div>
          </div>
        ))}
        {!dismissNudge && (
          <div className="card border-dashed">
            <strong className="text-[var(--sb-ink)]">Add a 2nd saved search</strong>
            <div className="mt-1.5 text-sm text-[var(--sb-muted)]">
              Optional · dismiss anytime · gentle reminder only
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/search" className="btn btn-outline no-underline text-[var(--sb-ink)]">
                Browse categories
              </Link>
              <Button variant="ghost" onClick={() => setDismissNudge(true)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-4">
        <h2 className="sb-title text-xl text-[var(--sb-ink)]">Official sites to watch</h2>
        <p className="text-sm text-[var(--sb-ink-soft)]">
          Price history from licensed open data lives on{" "}
          <Link href="/price-history" className="text-[var(--sb-accent)]">
            Price history
          </Link>
          ; federal tenders on{" "}
          <Link href="/tenders" className="text-[var(--sb-accent)]">
            Tenders
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SURPLUS_WATCHLIST.map((entry) => (
          <article key={entry.id} className="card flex flex-col">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--sb-ink)]">{entry.name}</h2>
                <p className="text-xs text-[var(--sb-muted)]">{entry.region}</p>
              </div>
              <SourceStatusBadge
                level={entry.id === "ns_open_data" || entry.id === "gcsurplus" ? "partial" : "official_site_only"}
              />
            </div>
            <p className="mb-4 flex-1 text-sm text-[var(--sb-ink-soft)]">{entry.whyLinkOut}</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {entry.tags.map((t) => (
                <span key={t} className="chip !py-0.5 !px-2 text-[11px]">
                  {t}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={entry.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary !py-2 !px-3 text-sm no-underline inline-flex items-center gap-1.5"
              >
                View official listing <ExternalLink size={14} />
              </a>
              <span className="inline-flex items-center gap-1 text-xs text-[var(--sb-muted)]">
                <Eye size={12} /> Opens the source site. Not ours.
              </span>
            </div>
          </article>
        ))}
      </div>
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} />}
    </div>
  );
}
