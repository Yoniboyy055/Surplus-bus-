import { readFileSync, existsSync } from "fs";
import path from "path";
import { LicenceAttribution } from "@/components/LicenceAttribution";
import { OGL_CANADA, OGL_NOVA_SCOTIA } from "@/lib/opendata/attribution";
import { parseGcSurplusSoldCsv } from "@/lib/opendata/gcsurplusSold";
import { parseNsPublicTenderCsv, parseNsRealPropertyCsv } from "@/lib/opendata/nsSurplus";

export const metadata = {
  title: "Price history — Surplus Bus",
  description: "Sold and awarded surplus comps from open government data (OGL–Canada / OGL–NS).",
};

function loadFixture(name: string): string | null {
  const p = path.join(process.cwd(), "fixtures", "open-data", name);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

export default function PriceHistoryPage() {
  const gcCsv = loadFixture("gcsurplus_sold_sample.csv");
  const nsT = loadFixture("ns_surplus_tender_sample.csv");
  const nsR = loadFixture("ns_surplus_real_property_sample.csv");

  const gcRows = gcCsv ? parseGcSurplusSoldCsv(gcCsv).slice(0, 12) : [];
  const nsRows = [
    ...(nsT ? parseNsPublicTenderCsv(nsT) : []),
    ...(nsR ? parseNsRealPropertyCsv(nsR) : []),
  ].slice(0, 12);

  const dbNote =
    "Showing fixture samples shipped in-repo (real open-data rows, personal contacts redacted). Live Supabase rows appear after migration 046 + cron with SUPABASE_SERVICE_ROLE_KEY.";

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--sb-accent)]">
          Price history
        </p>
        <h1 className="text-3xl font-bold text-[var(--sb-text)] tracking-tight">
          What has sold / been awarded
        </h1>
        <p className="max-w-2xl text-sm text-[var(--sb-text-secondary)]">
          Closed comps only — not a live auction feed. Built from licensed open-data CSVs. Closed
          rows are excluded from the ranked opportunity scorer.
        </p>
        <p className="text-xs text-[var(--sb-text-muted)]">{dbNote}</p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--sb-text)]">GCSurplus — What has Sold</h2>
          <LicenceAttribution licence={OGL_CANADA} className="max-w-xl" />
        </div>
        <div className="overflow-hidden rounded-xl border border-[var(--sb-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sb-bg-elevated)] text-left text-[var(--sb-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Closed</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Province</th>
                <th className="px-3 py-2 font-medium text-right">Sold</th>
              </tr>
            </thead>
            <tbody>
              {gcRows.map((r) => (
                <tr key={r.external_id} className="border-t border-[var(--sb-border)] bg-[var(--sb-surface)]">
                  <td className="px-3 py-2 text-[var(--sb-text-muted)] whitespace-nowrap">{r.closing_date || "—"}</td>
                  <td className="px-3 py-2 text-[var(--sb-text)]">{r.title}</td>
                  <td className="px-3 py-2 text-[var(--sb-text-muted)]">{r.province || "—"}</td>
                  <td className="px-3 py-2 text-right text-[var(--sb-text)]">
                    {r.sold_amount != null
                      ? `$${Math.round(r.sold_amount).toLocaleString("en-CA")}`
                      : "—"}
                  </td>
                </tr>
              ))}
              {!gcRows.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[var(--sb-text-muted)]">
                    No GCSurplus sample loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--sb-text)]">Nova Scotia Crown surplus history</h2>
          <LicenceAttribution licence={OGL_NOVA_SCOTIA} className="max-w-xl" />
        </div>
        <div className="overflow-hidden rounded-xl border border-[var(--sb-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sb-bg-elevated)] text-left text-[var(--sb-text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Fiscal year</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium text-right">Contract price</th>
              </tr>
            </thead>
            <tbody>
              {nsRows.map((r) => (
                <tr key={r.external_id} className="border-t border-[var(--sb-border)] bg-[var(--sb-surface)]">
                  <td className="px-3 py-2 text-[var(--sb-text-muted)] whitespace-nowrap">{r.fiscal_year || "—"}</td>
                  <td className="px-3 py-2 text-[var(--sb-text)]">
                    <div>{r.title}</div>
                    <div className="text-xs text-[var(--sb-text-disabled)]">{r.kind}</div>
                  </td>
                  <td className="px-3 py-2 text-[var(--sb-text-muted)]">{r.location || "—"}</td>
                  <td className="px-3 py-2 text-right text-[var(--sb-text)]">
                    {r.contract_price != null
                      ? `$${Math.round(r.contract_price).toLocaleString("en-CA")}`
                      : r.contract_price_raw || "—"}
                  </td>
                </tr>
              ))}
              {!nsRows.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[var(--sb-text-muted)]">
                    No Nova Scotia sample loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
