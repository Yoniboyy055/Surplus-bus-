import Link from "next/link";
import { ExternalLink, Eye } from "lucide-react";
import { SURPLUS_WATCHLIST } from "@/lib/opendata/watchlist";
import { SourceStatusBadge } from "@/components/SourceStatusBadge";

export const metadata = { title: "Official sites to watch" };

export default function WatchlistPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="sb-title text-[26px] text-[var(--sb-ink)]">Official sites to watch</h1>
          <p className="max-w-2xl text-sm text-[var(--sb-ink-soft)]">
            Live auctions stay on these official sites — we link out and never copy their listings. Most offer free
            new-listing alerts of their own. For sold-price history use{" "}
            <Link href="/price-history" className="underline text-[var(--sb-accent-700)]">Price history</Link>; for federal
            tenders, <Link href="/tenders" className="underline text-[var(--sb-accent-700)]">Tenders</Link>; to get matches in
            your inbox, <Link href="/saved" className="underline text-[var(--sb-accent-700)]">save a search</Link>.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SURPLUS_WATCHLIST.map((entry) => (
          <article key={entry.id} className="card flex flex-col">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--sb-ink)]">{entry.name}</h2>
                <p className="text-xs text-[var(--sb-ink-soft)]">{entry.region}</p>
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
              <span className="inline-flex items-center gap-1 text-xs text-[var(--sb-ink-soft)]">
                <Eye size={12} /> Opens the source site. Not ours.
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
