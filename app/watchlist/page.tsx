import Link from "next/link";
import { ExternalLink, Eye } from "lucide-react";
import { SURPLUS_WATCHLIST } from "@/lib/opendata/watchlist";
import { SourceStatusBadge } from "@/components/SourceStatusBadge";

export const metadata = {
  title: "Surplus watchlist — Surplus Bus",
  description: "Official Canadian surplus sites you can follow. Link-out only where scrape/reuse is not licensed.",
};

export default function WatchlistPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--sb-accent)]">
          Surplus watchlist
        </p>
        <h1 className="text-3xl font-bold text-[var(--sb-text)] tracking-tight">
          Official sites to watch
        </h1>
        <p className="max-w-2xl text-sm text-[var(--sb-text-secondary)] leading-relaxed">
          Follow these government and public surplus portals. Where terms ban scraping or
          redistribution, we only link out — we never invent listings. Price history from licensed
          open data lives on{" "}
          <Link href="/price-history" className="text-[var(--sb-accent)] hover:underline">
            Price history
          </Link>
          ; federal tenders on{" "}
          <Link href="/tenders" className="text-[var(--sb-accent)] hover:underline">
            Tenders
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SURPLUS_WATCHLIST.map((entry) => (
          <article
            key={entry.id}
            className="flex flex-col rounded-xl border border-[var(--sb-border)] bg-[var(--sb-surface)] p-5 transition-[border-color] duration-200 hover:border-[var(--sb-accent-border)]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--sb-text)]">{entry.name}</h2>
                <p className="text-xs text-[var(--sb-text-muted)]">{entry.region}</p>
              </div>
              <SourceStatusBadge
                level={entry.id === "ns_open_data" || entry.id === "gcsurplus" ? "partial" : "official_site_only"}
              />
            </div>
            <p className="mb-4 flex-1 text-sm text-[var(--sb-text-secondary)]">{entry.whyLinkOut}</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {entry.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[var(--sb-border)] px-2 py-0.5 text-[11px] text-[var(--sb-text-muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={entry.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--sb-accent)] px-3 py-2 text-sm font-semibold text-[var(--sb-text-inverse)] transition-transform duration-120 active:scale-[0.97]"
              >
                View official listing <ExternalLink size={14} />
              </a>
              <span className="inline-flex items-center gap-1 text-xs text-[var(--sb-text-muted)]">
                <Eye size={12} /> Opens the source site. Not ours.
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
