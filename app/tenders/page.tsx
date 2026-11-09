import Link from "next/link";
import { LicenceAttribution } from "@/components/LicenceAttribution";
import { DataStateNotice, FeedFreshnessChip } from "@/components/DataStateNotice";
import { OGL_CANADA } from "@/lib/opendata/attribution";
import { fetchFeedStatus, fetchTenders, cleanProvince } from "@/lib/opendata/queries";
import { classifyNotice } from "@/lib/opendata/tenderKind";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CanadaBuys tenders — Surplus Bus",
  description: "Tender notices listed as open on CanadaBuys, from its open-data CSV (OGL–Canada).",
};

const PAGE = 20;

function fmtDate(d: string | null) {
  if (!d) return "—";
  const t = Date.parse(d);
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export default async function TendersPage({
  searchParams: searchParamsP,
}: {
  searchParams: Promise<{ q?: string; province?: string; page?: string }>;
}) {
  const searchParams = await searchParamsP;
  const q = (searchParams.q || "").slice(0, 80);
  const province = cleanProvince(searchParams.province);
  const page = Math.max(1, Number.parseInt(searchParams.page || "1", 10) || 1);
  const [res, status] = await Promise.all([
    fetchTenders({ q, province, limit: PAGE, offset: (page - 1) * PAGE }),
    fetchFeedStatus(["canadabuys"]),
  ]);
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (province) u.set("province", province);
    u.set("page", String(p));
    return `/tenders?${u.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-0">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent-700)]">CanadaBuys tenders</p>
        <h1 className="sb-title text-[28px] text-[var(--sb-ink)]">Tender notices open on CanadaBuys</h1>
        <p className="max-w-2xl text-sm text-[var(--sb-ink-soft)]">
          From the official CanadaBuys open-data CSV only. Closed notices are not shown. Always confirm details on the
          official notice before acting.
        </p>
        {status.state === "ok" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <FeedFreshnessChip label="CanadaBuys" status={status.feeds.canadabuys} />
          </div>
        )}
      </header>

      <form className="flex flex-wrap items-end gap-3" action="/tenders" method="get" role="search">
        <label className="flex min-w-[220px] flex-1 flex-col text-sm text-[var(--sb-ink-soft)]">
          Search titles
          <input name="q" defaultValue={q} placeholder="vehicles, IT, furniture…" className="mt-1" />
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
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {res.state !== "ok" ? (
        <DataStateNotice state={res.state} what="Tender notices" />
      ) : res.rows.length === 0 ? (
        <div className="card text-center" data-state="empty">
          <h2 className="sb-title text-xl">{q || province ? "No open tenders match" : "No tender notices loaded yet"}</h2>
          <p className="mt-1 text-sm text-[var(--sb-ink-soft)]">
            {q || province ? "Try a broader word or another province." : "The first CanadaBuys ingest hasn't run yet."}
          </p>
        </div>
      ) : (
        <section className="space-y-4" aria-label="Open tenders">
          <p className="text-sm text-[var(--sb-ink-soft)]" data-total={res.total}>
            {res.total.toLocaleString("en-CA")} open notices{q ? ` matching “${q}”` : ""}
          </p>
          {!!res.hiddenPastClosing && (
            <p className="banner !mb-0 text-sm" data-hidden-past={res.hiddenPastClosing}>
              {res.hiddenPastClosing.toLocaleString("en-CA")} more notice{res.hiddenPastClosing === 1 ? " is" : "s are"} still marked “Open” on
              CanadaBuys but closed before today, so we don’t show {res.hiddenPastClosing === 1 ? "it" : "them"}.
            </p>
          )}
          {res.rows.map((t) => {
            const kind = classifyNotice(t.notice_type);
            return (
            <article key={t.id} className="card space-y-2" data-notice-kind={kind.kind}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--sb-ink-soft)]">
                {t.province && <span className="chip !py-0.5">{t.province}</span>}
                <span
                  className={
                    kind.kind === "bid"
                      ? ""
                      : "rounded-full border border-[rgba(188,143,25,0.35)] bg-[var(--sb-warning-bg)] px-2 py-0.5 font-semibold text-[var(--sb-warn-text)]"
                  }
                >
                  {kind.label}
                </span>
                {t.reference_number && <span className="sb-mono">{t.reference_number}</span>}
              </div>
              <h2 className="sb-title text-lg text-[var(--sb-ink)]">{t.title}</h2>
              {t.issuing_entity && <p className="text-sm text-[var(--sb-ink-soft)]">{t.issuing_entity}</p>}
              <p className="text-sm text-[var(--sb-ink-soft)]">
                Published {fmtDate(t.publication_date)} ·{" "}
                {t.closing_date ? (
                  <>Closes <strong className="text-[var(--sb-ink)]">{fmtDate(t.closing_date)}</strong></>
                ) : (
                  "No closing date listed"
                )}{" "}
                · check the official notice for amendments
              </p>
              {kind.note && <p className="text-sm text-[var(--sb-warn-text)]">{kind.note}</p>}
              {t.score != null && (
                <p className="text-sm text-[var(--sb-ink-soft)]">
                  Fit score <strong className="sb-mono text-[var(--sb-ink)]">{Math.round(t.score)}</strong>
                  {t.score_reasons?.length ? ` · ${t.score_reasons.slice(0, 3).join(" · ")}` : ""}
                </p>
              )}
              <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm no-underline text-[var(--sb-ink)]">
                View official notice ↗<span className="sr-only"> (opens CanadaBuys in a new tab)</span>
              </a>
            </article>
            );
          })}
          <nav className="flex items-center justify-between text-sm" aria-label="Pages">
            {page > 1 ? <Link href={qs(page - 1)} className="btn btn-outline btn-sm no-underline">Previous</Link> : <span />}
            <span className="text-[var(--sb-ink-soft)]">Page {page} of {Math.max(1, Math.ceil(res.total / PAGE))}</span>
            {page * PAGE < res.total ? <Link href={qs(page + 1)} className="btn btn-outline btn-sm no-underline">Next</Link> : <span />}
          </nav>
        </section>
      )}

      <footer className="space-y-1">
        <LicenceAttribution licence={OGL_CANADA} />
        <p className="text-xs text-[var(--sb-ink-soft)]">
          Contracting officers’ names, emails and phone numbers are removed; find them on the official notice.
        </p>
      </footer>
    </div>
  );
}
