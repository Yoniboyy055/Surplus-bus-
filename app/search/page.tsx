import Link from "next/link";
import { LicenceAttribution } from "@/components/LicenceAttribution";
import { DataStateNotice, FeedFreshnessChip } from "@/components/DataStateNotice";
import { KindFacets } from "@/components/KindFacets";
import { LotTable } from "@/components/LotTable";
import { OGL_CANADA, OGL_NOVA_SCOTIA } from "@/lib/opendata/attribution";
import { fetchFeedStatus, fetchMatchSample, fetchPriceHistory } from "@/lib/opendata/queries";
import { FILTERABLE_KINDS, KIND_LABEL, planSearch } from "@/lib/opendata/search";
import { kindFacets, lotHref, parseLotParams, toFilters } from "@/lib/opendata/lotParams";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search sold surplus — Surplus Bus",
  description: "Search closed Canadian government surplus lots by item, kind, place, date and price. Open government data.",
};

const PAGE = 25;
const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = parseLotParams(await searchParams);
  const plan = p.q ? planSearch(p.q) : null;
  const [res, sample, status] = await Promise.all([
    fetchPriceHistory({ ...toFilters(p), sort: p.sort, limit: PAGE, offset: (p.page - 1) * PAGE }),
    p.q ? fetchMatchSample(toFilters(p, false)) : Promise.resolve(null),
    fetchFeedStatus(["gcsurplus_sold", "ns_surplus"]),
  ]);
  const filtered = Boolean(p.q || p.province || p.city || p.feed || p.kind || p.from || p.to || p.minPrice != null || p.maxPrice != null);
  const field = "mt-1 w-full";
  const lbl = "flex flex-col text-sm text-[var(--sb-ink-soft)]";

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 md:px-0">
      <header className="space-y-2">
        <h1 className="sb-title text-[28px] text-[var(--sb-ink)]">Search sold surplus</h1>
        <p className="max-w-2xl text-sm text-[var(--sb-ink-soft)]">
          Closed lots from official open-data files (GCSurplus and Nova Scotia). Not live auctions: open the official
          sale sites to bid.
        </p>
        {status.state === "ok" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <FeedFreshnessChip label="GCSurplus" status={status.feeds.gcsurplus_sold} />
            <FeedFreshnessChip label="Nova Scotia" status={status.feeds.ns_surplus} />
          </div>
        )}
      </header>

      <form action="/search" method="get" role="search" className="card space-y-4" aria-label="Search and filters">
        <div className="flex items-center gap-2.5 rounded-full border border-[var(--sb-line)] bg-[var(--sb-surface-raised)] py-1.5 pl-5 pr-1.5 shadow-raised">
          <input name="q" defaultValue={p.q} aria-label="What are you looking for?" placeholder="pickup, generator, laptop…" className="min-w-0 flex-1 border-0 bg-transparent px-0 py-2.5 shadow-none focus:ring-0" />
          <button type="submit" className="btn btn-primary shrink-0">Search</button>
        </div>
        <details open={Boolean(p.province || p.city || p.from || p.to || p.minPrice != null || p.maxPrice != null || p.feed || p.kindParam || p.sort !== "recent")} className="group">
          <summary className="cursor-pointer select-none text-sm font-semibold text-[var(--sb-ink)]">Filters</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <label className={lbl}>
              Kind of item
              <select name="kind" defaultValue={p.kindParam ?? ""} className={field}>
                <option value="">{plan?.vehicleIntent ? "Auto (cars & trucks)" : "All kinds"}</option>
                <option value="all">All kinds</option>
                {FILTERABLE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
            </label>
            <label className={lbl}>
              Province
              <select name="province" defaultValue={p.province ?? ""} className={field}>
                <option value="">All</option>
                {PROVINCES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className={lbl}>
              City or place
              <input name="city" defaultValue={p.city ?? ""} placeholder="Edmonton" className={field} />
            </label>
            <label className={lbl}>
              Source
              <select name="feed" defaultValue={p.feed ?? ""} className={field}>
                <option value="">All</option>
                <option value="gcsurplus_sold">GCSurplus (federal)</option>
                <option value="ns_surplus">Nova Scotia</option>
              </select>
            </label>
            <label className={lbl}>
              Closed from
              <input type="date" name="from" defaultValue={p.from ?? ""} className={field} />
            </label>
            <label className={lbl}>
              Closed to
              <input type="date" name="to" defaultValue={p.to ?? ""} className={field} />
            </label>
            <label className={lbl}>
              Sold for at least (C$)
              <input type="number" inputMode="numeric" min={0} name="min" defaultValue={p.minPrice ?? ""} className={field} />
            </label>
            <label className={lbl}>
              Sold for at most (C$)
              <input type="number" inputMode="numeric" min={0} name="max" defaultValue={p.maxPrice ?? ""} className={field} />
            </label>
            <label className={lbl}>
              Sort
              <select name="sort" defaultValue={p.sort} className={field}>
                <option value="recent">Most recent</option>
                <option value="price_high">Highest price</option>
                <option value="price_low">Lowest price</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm">Apply filters</button>
            <Link href={p.q ? `/search?q=${encodeURIComponent(p.q)}` : "/search"} className="btn btn-ghost btn-sm no-underline">Clear filters</Link>
          </div>
        </details>
      </form>

      {plan && plan.expandedWith.length > 0 && (
        <p className="text-sm text-[var(--sb-ink-soft)]" data-testid="expanded-note">
          Also matching related names in the data: {plan.expandedWith.slice(0, 8).join(", ")}
          {plan.expandedWith.length > 8 ? ` and ${plan.expandedWith.length - 8} more` : ""}.
        </p>
      )}
      {sample?.state === "ok" && (
        <KindFacets path="/search" params={p} facets={kindFacets(sample.rows)} total={sample.total} capped={sample.total > sample.rows.length} />
      )}

      {res.state !== "ok" ? (
        <DataStateNotice state={res.state} what="Search" />
      ) : res.rows.length === 0 ? (
        <div className="card text-center" data-state="empty">
          <h2 className="sb-title text-xl">{filtered ? "No sold lots match" : "No sold lots loaded yet"}</h2>
          <p className="mt-1 text-sm text-[var(--sb-ink-soft)]">
            {filtered ? "Try a broader word, another kind, or fewer filters." : "The first open-data ingest hasn't run yet. We don't show placeholder prices."}
          </p>
          {p.kind && <Link href={lotHref("/search", p, { kind: "all" })} className="btn btn-outline mt-3 no-underline">Show all kinds</Link>}
        </div>
      ) : (
        <>
          {p.q && (
            <p className="text-sm">
              <Link href={lotHref("/comps", p)} className="underline text-[var(--sb-accent-700)]">See the typical sold range for “{p.q}”</Link>
            </p>
          )}
          <LotTable
            rows={res.rows}
            total={res.total}
            page={p.page}
            pageSize={PAGE}
            hrefFor={(n) => lotHref("/search", p, { page: String(n) })}
            label={`${res.total.toLocaleString("en-CA")} sold or awarded lot${res.total === 1 ? "" : "s"}${p.q ? ` matching “${p.q}”` : ""}${p.kind ? ` · ${KIND_LABEL[p.kind].toLowerCase()}` : ""}`}
          />
        </>
      )}

      <footer className="space-y-1">
        <LicenceAttribution licence={OGL_CANADA} />
        <LicenceAttribution licence={OGL_NOVA_SCOTIA} />
        <p className="text-xs text-[var(--sb-ink-soft)]">
          Each row links to the dataset it came from. Contact details in source files are removed. See <Link href="/legal/attributions" className="underline">attributions</Link>.
        </p>
      </footer>
    </div>
  );
}
