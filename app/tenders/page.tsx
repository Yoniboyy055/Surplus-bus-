import { readFileSync, existsSync } from "fs";
import path from "path";
import { ExternalLink } from "lucide-react";
import { LicenceAttribution } from "@/components/LicenceAttribution";
import { OGL_CANADA } from "@/lib/opendata/attribution";
import { parseCanadaBuysOpenTendersCsv } from "@/lib/opendata/canadabuys";
import { scoreOpportunityV2 } from "@/lib/intelligence/scoring";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { SourceStatusBadge } from "@/components/SourceStatusBadge";

export const metadata = {
  title: "CanadaBuys tenders — Surplus Bus",
  description: "Open federal tender notices from the CanadaBuys open-data CSV (OGL–Canada).",
};

function loadFixture(name: string): string | null {
  const p = path.join(process.cwd(), "fixtures", "open-data", name);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

export default function TendersPage() {
  const csv = loadFixture("canadabuys_open_tenders_sample.csv");
  const all = csv ? parseCanadaBuysOpenTendersCsv(csv) : [];
  const open = all.filter((r) => r.status === "open");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--sb-accent)]">
          CanadaBuys tenders
        </p>
        <h1 className="text-3xl font-bold text-[var(--sb-text)] tracking-tight">
          Open federal tender notices
        </h1>
        <p className="max-w-2xl text-sm text-[var(--sb-text-secondary)]">
          Sourced only from the official CanadaBuys open-data CSV. We do not scrape the CanadaBuys
          HTML UI (robots Disallow:/). Closed notices are filtered from ranking.
        </p>
        <LicenceAttribution licence={OGL_CANADA} />
        <p className="text-xs text-[var(--sb-text-muted)]">
          Showing in-repo fixture sample (real CSV rows). Full refresh via daily cron after SQL
          migration 046 + service role key.
        </p>
      </div>

      <div className="space-y-4">
        {open.map((t) => {
          const scored = scoreOpportunityV2({
            id: t.external_id,
            category: t.category,
            province: t.province,
            estimated_value: t.estimated_value,
            closing_date: t.closing_date,
            source_url: t.source_url,
            first_seen_at: t.publication_date,
            status: t.status,
          });
          return (
            <article
              key={t.external_id}
              className="rounded-xl border border-[var(--sb-border)] bg-[var(--sb-surface)] p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SourceStatusBadge level="live" />
                <span className="text-xs text-[var(--sb-text-muted)]">{t.province}</span>
                {t.category && (
                  <span className="text-xs text-[var(--sb-text-muted)]">· {t.category}</span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-[var(--sb-text)]">{t.title}</h2>
              {t.issuing_entity && (
                <p className="text-sm text-[var(--sb-text-secondary)]">{t.issuing_entity}</p>
              )}
              {!scored.excluded && (
                <ScoreBreakdown
                  score={scored.score}
                  status="open"
                  parts={scored.parts}
                  reasons={scored.reasons}
                  variant="compact"
                />
              )}
              <a
                href={t.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--sb-accent)] hover:underline"
              >
                View official listing <ExternalLink size={14} />
              </a>
              <p className="text-xs text-[var(--sb-text-muted)]">Opens the source site. Not ours.</p>
            </article>
          );
        })}
        {!open.length && (
          <div className="rounded-xl border border-[var(--sb-border)] p-10 text-center text-[var(--sb-text-muted)]">
            No open tenders in the fixture sample.
          </div>
        )}
      </div>
    </div>
  );
}
