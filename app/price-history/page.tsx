import Link from "next/link";
import { LicenceAttribution } from "@/components/LicenceAttribution";
import { DataStateNotice, FeedFreshnessChip } from "@/components/DataStateNotice";
import { OGL_CANADA, OGL_NOVA_SCOTIA } from "@/lib/opendata/attribution";
import { fetchFeedStatus, fetchMatchSample, fetchPriceHistory } from "@/lib/opendata/queries";
import { KIND_LABEL } from "@/lib/opendata/search";
import { kindFacets, lotHref, parseLotParams, toFilters } from "@/lib/opendata/lotParams";
import { KindFacets } from "@/components/KindFacets";
import { LotTable } from "@/components/LotTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Price history — Surplus Bus",
  description: "Sold and awarded Canadian public surplus from open government data (OGL–Canada / OGL–NS).",
};

const PAGE = 25;

export default async function PriceHistoryPage({
  searchParams: searchParamsP,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseLotParams(await searchParamsP);
  const { q, province, feed, page } = params;
  const [res, sample, status] = await Promise.all([
    fetchPriceHistory({ ...toFilters(params), limit: PAGE, offset: (page - 1) * PAGE }),
    q ? fetchMatchSample(toFilters(params, false)) : Promise.resolve(null),
    fetchFeedStatus(["gcsurplus_sold", "ns_surplus"]),
  ]);
  const qs = (n: number) => lotHref("/price-history", params, { page: String(n) });

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

      {sample?.state === "ok" && (
        <KindFacets path="/price-history" params={params} facets={kindFacets(sample.rows)} total={sample.total} capped={sample.total > sample.rows.length} />
      )}

      {res.state !== "ok" ? (
        <DataStateNotice state={res.state} what="Price history" />
      ) : res.rows.length === 0 ? (
        <div className="card text-center" data-state="empty">
          <h2 className="sb-title text-xl">{q || province || feed || params.kind ? "No sold lots match" : "No sold lots loaded yet"}</h2>
          <p className="mt-1 text-sm text-[var(--sb-ink-soft)]">
            {q || province || feed || params.kind
              ? "Try a broader word, another province or all kinds."
              : "The first open-data ingest hasn't run yet. We don't show placeholder prices."}
          </p>
        </div>
      ) : (
        <LotTable
          rows={res.rows}
          total={res.total}
          page={page}
          pageSize={PAGE}
          hrefFor={qs}
          label={`${res.total.toLocaleString("en-CA")} sold or awarded lots${q ? ` matching “${q}”` : ""}${params.kind ? ` · ${KIND_LABEL[params.kind].toLowerCase()}` : ""}`}
        />
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
