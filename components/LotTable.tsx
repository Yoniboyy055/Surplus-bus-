import Link from "next/link";
import { formatCad } from "@/lib/opendata/comps";
import type { PriceHistoryRow } from "@/lib/opendata/queries";
import { ReportLink } from "./ReportLink";

/** Sold-lot results table + pager. Every row links to its source dataset (OGL attribution). */
export function LotTable({ rows, total, page, pageSize, hrefFor, label }: { rows: PriceHistoryRow[]; total: number; page: number; pageSize: number; hrefFor: (p: number) => string; label: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <section className="card overflow-x-auto" aria-label={label}>
      <p className="mb-3 text-sm text-[var(--sb-ink-soft)]" data-total={total}>
        {label}
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
            {rows.map((r) => (
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
                  <div>
                    <ReportLink feedKey={r.feed_key} externalId={r.external_id} title={r.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
        {page > 1 ? <Link href={hrefFor(page - 1)} className="btn btn-outline btn-sm no-underline" rel="prev">Previous</Link> : <span />}
        <span className="text-[var(--sb-ink-soft)]">Page {page.toLocaleString("en-CA")} of {pages.toLocaleString("en-CA")}</span>
        {page < pages ? <Link href={hrefFor(page + 1)} className="btn btn-outline btn-sm no-underline" rel="next">Next</Link> : <span />}
      </nav>
    </section>
  );
}
