import Link from "next/link";
import { DataStateNotice } from "@/components/DataStateNotice";
import { fetchLot } from "@/lib/opendata/queries";
import { formatCad } from "@/lib/opendata/comps";
import { classifyLot, KIND_LABEL } from "@/lib/opendata/kinds";
import { ReportForm } from "./ReportForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Report a wrong result — Surplus Bus",
  robots: { index: false, follow: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";

export default async function ReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const feed = one(sp.feed);
  const id = one(sp.id);
  const res = await fetchLot(feed, id);

  if (res.state !== "ok") {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-8">
        <h1 className="sb-title text-[26px]">Report a wrong result</h1>
        <DataStateNotice state={res.state} what="This lot" />
      </div>
    );
  }
  const lot = res.rows[0];
  if (!lot) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-8 text-center" data-state="not-found">
        <h1 className="sb-title text-[26px]">We couldn&rsquo;t find that lot</h1>
        <p className="text-sm text-[var(--sb-ink-soft)]">The link may be incomplete. Go back to your results and try the Report link again.</p>
        <Link href="/search" className="btn btn-outline no-underline text-[var(--sb-ink)]">Back to search</Link>
      </div>
    );
  }
  const kind = classifyLot(lot);
  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-8">
      <div>
        <h1 className="sb-title text-[26px]">Report a wrong result</h1>
        <p className="mt-1 text-sm text-[var(--sb-ink-soft)]">
          Tell us what looks off about this lot. We read reports and fix single rows by hand; the source data itself is never changed.
        </p>
      </div>
      <div className="card space-y-1.5" data-testid="report-lot">
        <p className="font-semibold text-[var(--sb-ink)]">{lot.title}</p>
        <p className="text-sm text-[var(--sb-ink-soft)]">
          Sold <strong className="sb-mono text-[var(--sb-ink)]">{formatCad(lot.sold_amount)}</strong>
          {lot.closing_date ? ` · closed ${lot.closing_date}` : ""}
          {[lot.city, lot.province].filter(Boolean).length ? ` · ${[lot.city, lot.province].filter(Boolean).join(", ")}` : ""}
        </p>
        <p className="text-sm text-[var(--sb-ink-soft)]">
          We currently file this under <strong className="text-[var(--sb-ink)]" data-testid="report-current-kind">{KIND_LABEL[kind]}</strong>.{" "}
          <a href={lot.source_url} target="_blank" rel="noopener noreferrer" className="underline text-[var(--sb-accent-700)]">
            See the source dataset<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>
      <ReportForm feedKey={lot.feed_key} externalId={lot.external_id} currentKind={kind} />
    </div>
  );
}
