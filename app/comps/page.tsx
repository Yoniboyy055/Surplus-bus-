import Image from "next/image";
import Link from "next/link";
import { LicenceAttribution } from "@/components/LicenceAttribution";
import { DataStateNotice, FeedFreshnessChip } from "@/components/DataStateNotice";
import { OGL_CANADA, OGL_NOVA_SCOTIA } from "@/lib/opendata/attribution";
import { fetchFeedStatus, fetchMatchSample, fetchPriceHistory } from "@/lib/opendata/queries";
import { BAND_MIN_N, computeCompStats, formatCad } from "@/lib/opendata/comps";
import { assessHomogeneity, classifyTitle, KIND_LABEL, planSearch, RANGE_MAX_SPREAD } from "@/lib/opendata/search";
import { kindFacets, lotHref, parseLotParams, toFilters } from "@/lib/opendata/lotParams";
import { KindFacets } from "@/components/KindFacets";
import { SaveSearchButton } from "./SaveSearchButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sold comps — Surplus Bus",
  description: "What similar Canadian public surplus has actually sold for, from open government data.",
};

export default async function CompsPage({ searchParams: searchParamsP }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseLotParams(await searchParamsP);
  const { q, province } = params;

  if (!q) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <h1 className="sb-title mb-2 text-[26px]">Sold comps</h1>
        <p className="mb-5 text-sm text-[var(--sb-ink-soft)]">Search for an item to see what similar lots sold for.</p>
        <form action="/comps" method="get" role="search" className="flex gap-2">
          <input name="q" aria-label="Item to look up" placeholder="pickup truck" className="flex-1" />
          <button className="btn btn-primary" type="submit">Look up</button>
        </form>
      </div>
    );
  }

  const plan = planSearch(q);
  const [sample, rows, status] = await Promise.all([
    fetchMatchSample(toFilters(params, false)),
    fetchPriceHistory({ ...toFilters(params), limit: 12 }),
    fetchFeedStatus(["gcsurplus_sold", "ns_surplus"]),
  ]);

  if (sample.state !== "ok" || rows.state !== "ok") {
    const s = sample.state !== "ok" ? sample.state : rows.state !== "ok" ? rows.state : "error";
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <h1 className="sb-title text-[26px]">{q} · sold comps</h1>
        <DataStateNotice state={s as "not_configured" | "not_migrated" | "error"} what="Sold comps" />
      </div>
    );
  }

  // Same kind rules as the database filter (lib/opendata/search.ts), applied to the match sample.
  const kindRows = params.kind ? sample.rows.filter((r) => classifyTitle(r.title) === params.kind) : sample.rows;
  const stats = computeCompStats(kindRows.map((r) => r.sold_amount));
  const homo = assessHomogeneity(kindRows);
  const facets = kindFacets(sample.rows);
  const capped = sample.total > sample.rows.length;
  const showBand = Boolean(stats?.showBand && homo.ok);
  const stale = status.state === "ok" && Object.values(status.feeds).some((f) => f.state === "stale" || f.state === "failing");

  if (!stats) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center" data-state="empty">
        <div className="relative mx-auto mb-5 h-[200px] w-[280px] overflow-hidden rounded-[20px] shadow-raised">
          <Image src="/images/empty_crate.jpg" alt="Empty wooden crate, AI-generated illustration" fill className="object-cover" />
          <span className="absolute right-2 top-2 rounded-full bg-[var(--sb-ink)] px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--sb-bg)]">AI illustration</span>
        </div>
        <h1 className="sb-title mb-2 text-[26px]">No sold comps for “{q}”</h1>
        <p className="mb-5 text-sm text-[var(--sb-ink-soft)]">
          {params.kind && sample.rows.length
            ? `None of the ${sample.rows.length.toLocaleString("en-CA")} matches look like ${KIND_LABEL[params.kind].toLowerCase()}. Try All kinds.`
            : "Try a broader word, or check spelling. We only show real closed lots from open government data."}
        </p>
        <div className="flex justify-center gap-2">
          {params.kind && sample.rows.length ? (
            <Link href={lotHref("/comps", params, { kind: "all" })} className="btn btn-outline no-underline text-[var(--sb-ink)]">Show all kinds</Link>
          ) : (
            <Link href={lotHref("/search", params)} className="btn btn-outline no-underline text-[var(--sb-ink)]">Edit search</Link>
          )}
          <SaveSearchButton q={q} province={province} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-0">
      {stale && (
        <div className="banner" role="note">
          Some source data is older than its normal refresh window. Treat these numbers as historical context.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="sb-title text-[26px] text-[var(--sb-ink)]">{q} · sold comps{province ? ` · ${province}` : ""}</h1>
          {status.state === "ok" && (
            <div className="mt-2 flex flex-wrap gap-2">
              <FeedFreshnessChip label="GCSurplus" status={status.feeds.gcsurplus_sold} />
              <FeedFreshnessChip label="Nova Scotia" status={status.feeds.ns_surplus} />
            </div>
          )}
        </div>
        <SaveSearchButton q={q} province={province} />
      </div>

      {plan.expandedWith.length > 0 && (
        <p className="text-sm text-[var(--sb-ink-soft)]" data-testid="expanded-note">
          Also matching related names in the data: {plan.expandedWith.slice(0, 8).join(", ")}
          {plan.expandedWith.length > 8 ? ` and ${plan.expandedWith.length - 8} more` : ""}.
        </p>
      )}
      <KindFacets path="/comps" params={params} facets={facets} total={sample.total} capped={capped} />

      <div className="grid items-center gap-5 md:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden overflow-hidden rounded-[30px] bg-[var(--sb-surface)] shadow-raised md:block">
          <Image src="/images/price_range_tags.jpg" alt="Clay price tags, AI-generated illustration (not a real lot)" width={1200} height={900} className="h-auto w-full" />
          <span className="absolute right-3 top-3 rounded-full bg-[var(--sb-ink)] px-2.5 py-1 text-[10px] font-bold tracking-wider text-[var(--sb-bg)]">AI illustration</span>
        </div>
        <div className="card" data-n={stats.n} data-range={showBand ? "shown" : homo.reason}>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent-700)]">
            {showBand ? "Typical sold range · not a guarantee" : !stats.showBand ? "Too few sales for a range" : "No single typical range"}
          </div>
          {showBand ? (
            <>
              <p className="mb-4 text-sm text-[var(--sb-ink-soft)]">
                Middle half (p25–p75) of {stats.n.toLocaleString("en-CA")} similar closed lots
                {params.kind ? ` (${KIND_LABEL[params.kind].toLowerCase()})` : ""}. Historical context only — not an appraisal and
                not a bid recommendation.
              </p>
              <div className="guidance-band motion-band" aria-hidden>
                <div className="guidance-band-fill" />
                <div className="guidance-band-tick" />
              </div>
              <div className="mt-2.5 flex justify-between text-sm text-[var(--sb-ink-soft)]">
                <span>p25 <strong className="sb-mono text-[var(--sb-ink)]">{formatCad(stats.p25)}</strong></span>
                <span>median <strong className="sb-mono text-[var(--sb-ink)]">{formatCad(stats.median)}</strong></span>
                <span>p75 <strong className="sb-mono text-[var(--sb-ink)]">{formatCad(stats.p75)}</strong></span>
              </div>
            </>
          ) : !stats.showBand ? (
            <p className="text-sm text-[var(--sb-ink-soft)]">
              Only {stats.n} matching sale{stats.n === 1 ? "" : "s"} (we need {BAND_MIN_N} for a range). The individual
              sales are listed below.
            </p>
          ) : homo.reason === "mixed_kinds" ? (
            <div className="space-y-2 text-sm text-[var(--sb-ink-soft)]" data-testid="narrow-note">
              <p>
                These matches mix different kinds of items
                {homo.dominant ? `: only ${Math.round(homo.share * 100)}% look like ${KIND_LABEL[homo.dominant].toLowerCase()}` : ""}. One
                price range would mislead, so narrow the search first.
              </p>
              {homo.dominant && !params.kind && (
                <p>
                  <Link href={lotHref("/comps", params, { kind: homo.dominant })} className="underline text-[var(--sb-accent-700)]">
                    Show only {KIND_LABEL[homo.dominant].toLowerCase()} ({(homo.kinds[homo.dominant] || 0).toLocaleString("en-CA")})
                  </Link>
                  {" "}or add a make, model or size to your search.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--sb-ink-soft)]" data-testid="narrow-note">
              Prices for these matches vary too widely (the upper quarter starts at over {RANGE_MAX_SPREAD}× the lower quarter)
              for one typical range. Add a make, model or size to narrow the search.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <span className="chip"><strong className="sb-mono">n = {stats.n}</strong>&nbsp;sold comps</span>
            <span className="chip">Range {formatCad(stats.min)} – {formatCad(stats.max)}</span>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <p className="mb-2 text-sm text-[var(--sb-ink-soft)]">Most recent matching sales</p>
        <div className="relative -mx-2 overflow-x-auto px-2" tabIndex={0} role="region" aria-label="Sold lots table (scrolls sideways)">
          <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-[var(--sb-line)] text-left text-xs uppercase tracking-wider text-[var(--sb-ink-soft)]">
              <th className="px-2 py-2.5 font-semibold">Lot</th>
              <th className="px-2 py-2.5 font-semibold">Sold</th>
              <th className="px-2 py-2.5 font-semibold">Closed</th>
              <th className="px-2 py-2.5 font-semibold">Where</th>
            </tr>
          </thead>
          <tbody>
            {rows.rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--sb-line)]">
                <td className="px-2 py-3 text-[var(--sb-ink)]">{r.title}</td>
                <td className="sb-mono px-2 py-3 font-bold text-[var(--sb-ink)]">{formatCad(r.sold_amount)}</td>
                <td className="px-2 py-3 text-[var(--sb-ink-soft)]">{r.closing_date || r.fiscal_year || "—"}</td>
                <td className="px-2 py-3 text-[var(--sb-ink-soft)]">{[r.city, r.province].filter(Boolean).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        <p className="mt-3 text-sm">
          <Link href={lotHref("/search", params)} className="underline text-[var(--sb-accent-700)]">
            See all {rows.total.toLocaleString("en-CA")} matching lots
          </Link>
        </p>
        <div className="mt-3 space-y-1">
          <LicenceAttribution licence={OGL_CANADA} />
          <LicenceAttribution licence={OGL_NOVA_SCOTIA} />
        </div>
      </div>
    </div>
  );
}
