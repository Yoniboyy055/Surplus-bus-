import Link from "next/link";
import { LicenceAttribution } from "@/components/LicenceAttribution";
import { DataStateNotice, FeedFreshnessChip } from "@/components/DataStateNotice";
import { OGL_CANADA, OGL_NOVA_SCOTIA } from "@/lib/opendata/attribution";
import { fetchFeedStatus, fetchPriceHistory, cleanProvince } from "@/lib/opendata/queries";
import { formatCad } from "@/lib/opendata/comps";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Price history — Surplus Bus",
  description: "Sold and awarded Canadian public surplus from open government data (OGL–Canada / OGL–NS).",
};

const PAGE = 25;

export default async function PriceHistoryPage({
  searchParams: searchParamsP,
}: {
  searchParams: Promise<{ q?: string; province?: string; feed?: string; page?: string }>;
}) {
  const searchParams = await searchParamsP;
  const q = (searchParams.q || "").slice(0, 80);
  const province = cleanProvince(searchParams.province);
  const feed = searchParams.feed === "ns_surplus" ? "ns_surplus" : searchParams.feed === "gcsurplus_sold" ? "gcsurplus_sold" : null;
  const page = Math.max(1, Number.parseInt(searchParams.page || "1", 10) || 1);
  const [res, status] = await Promise.all([
    fetchPriceHistory({ q, province, feed, limit: PAGE, offset: (page - 1) * PAGE }),
    fetchFeedStatus(["gcsurplus_sold", "ns_surplus"]),
  ]);
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (province) u.set("province", province);
    if (feed) u.set("feed", feed);
    u.set("page", String(p));
    return `/price-history?${u.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-0">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent-700)]">Price history</p>
        <h1 className="sb-title text-[28px] text-[var(--sb-ink)]">What has sold or been awarded</h1>
        <p className="max-w-2xl text-sm text-[var(--sb-ink-soft)]">
          Closed lots only, from official open-data files. Not a live auction feed. Every row links to its
          source dataset.
        </p>
        {status.state === "ok" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <FeedFreshnessChip label="GCSurplus" status={status.feeds.gcsurplus_sold} />
            <FeedFreshnessChip label="Nova Scotia" status={status.feeds.ns_surplus} />
          </div>
        )}
      </header>

      <form className="flex flex-wrap items-end gap-3" action="/price-history" method="get" role="search">
        <label className="flex min-w-[220px] flex-1 flex-col text-sm text-[var(--sb-ink-soft)]">
          Search titles
          <input name="q" defaultValue={q} placeholder="truck, chair, laptop…" className="mt-1" />
        </label>
        <label className="flex flex-col text-sm text-[var(--sb-ink-soft)]">
          Province
          <select name="province" defaultValue={province || ""} className="mt-1">
            <option value="">All</option>
            {["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm text-[var(--sb-ink-soft)]">
          Source
          <select name="feed" defaultValue={feed || ""} className="mt-1">
            <option value="">All</option>
            <option value="gcsurplus_sold">GCSurplus (federal)</option>
            <option value="ns_surplus">Nova Scotia</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {res.state !== "ok" ? (
        <DataStateNotice state={res.state} what="Price history" />
      ) : res.rows.length === 0 ? (
        <div className="card text-center" data-state="empty">
          <h2 className="sb-title text-xl">{q || province || feed ? "No sold lots match" : "No sold lots loaded yet"}</h2>
          <p className="mt-1 text-sm text-[var(--sb-ink-soft)]">
            {q || province || feed
              ? "Try a broader word or another province."
              : "The first open-data ingest hasn't run yet. We don't show placeholder prices."}
          </p>
        </div>
      ) : (
        <section className="card overflow-x-auto" aria-label="Sold lots">
          <p className="mb-3 text-sm text-[var(--sb-ink-soft)]" data-total={res.total}>
            {res.total.toLocaleString("en-CA")} sold or awarded lots{q ? ` matching “${q}”` : ""}
          </p>
          <div className="relative -mx-2 overflow-x-auto px-2" tabIndex={0} role="region" aria-label="Sold lots table (scrolls sideways)">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[var(--sb-line)] text-left text-xs uppercase tracking-wider text-[var(--sb-ink-soft)]">
                <th className="px-2 py-2.5 font-semibold">Closed</th>
                <th className="px-2 py-2.5 font-semibold">Lot</th>
                <th className="px-2 py-2.5 font-semibold">Where</th>
                <th className="px-2 py-2.5 text-right font-semibold">Sold</th>
                <th className="px-2 py-2.5 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--sb-line)] align-top">
                  <td className="whitespace-nowrap px-2 py-3 text-[var(--sb-ink-soft)]">{r.closing_date || r.fiscal_year || "—"}</td>
                  <td className="px-2 py-3 text-[var(--sb-ink)]">{r.title}</td>
                  <td className="px-2 py-3 text-[var(--sb-ink-soft)]">{[r.city, r.province].filter(Boolean).join(", ") || "—"}</td>
                  <td className="sb-mono whitespace-nowrap px-2 py-3 text-right font-bold text-[var(--sb-ink)]">{formatCad(r.sold_amount)}</td>
                  <td className="px-2 py-3">
                    <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-[var(--sb-accent-700)] underline">
                      {r.feed_key === "ns_surplus" ? "NS open data" : "GCSurplus open data"}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
            {page > 1 ? <Link href={qs(page - 1)} className="btn btn-outline btn-sm no-underline">Previous</Link> : <span />}
            <span className="text-[var(--sb-ink-soft)]">Page {page} of {Math.max(1, Math.ceil(res.total / PAGE))}</span>
            {page * PAGE < res.total ? <Link href={qs(page + 1)} className="btn btn-outline btn-sm no-underline">Next</Link> : <span />}
          </nav>
        </section>
      )}

      <footer className="space-y-1">
        <LicenceAttribution licence={OGL_CANADA} />
        <LicenceAttribution licence={OGL_NOVA_SCOTIA} />
        <p className="text-xs text-[var(--sb-ink-soft)]">
          Contact details in source notices are removed. See <Link href="/legal/attributions" className="underline">attributions</Link>.
        </p>
      </footer>
    </div>
  );
}
