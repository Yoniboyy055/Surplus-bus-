const WEIGHTS = [
  { id: "fit", weight: 40, label: "Fit" },
  { id: "time", weight: 25, label: "Time to act" },
  { id: "value", weight: 20, label: "Value" },
  { id: "quality", weight: 10, label: "Data quality" },
  { id: "fresh", weight: 5, label: "Freshness" },
] as const;

export type ScorePart = {
  id: "fit" | "time" | "value" | "quality" | "fresh";
  weight: number;
  earned: number;
  label: string;
};

export function ScoreBreakdown({
  score,
  status,
  parts,
  reasons = [],
  variant = "compact",
}: {
  score: number;
  status: string;
  parts?: ScorePart[];
  reasons?: string[];
  variant?: "compact" | "panel";
}) {
  const closed = ["closed", "awarded", "expired", "sold", "withdrawn"].includes(
    (status || "").toLowerCase()
  );

  if (closed) {
    return (
      <div className="rounded-lg border border-[var(--sb-closed-border)] bg-[var(--sb-closed-bg)] px-3 py-2 text-sm text-[var(--sb-closed-fg)]">
        Not scored — closed or past closing date.
      </div>
    );
  }

  const rows = parts?.length
    ? parts
    : WEIGHTS.map((w) => ({
        id: w.id,
        weight: w.weight,
        earned: 0,
        label: w.label,
      }));

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--sb-text-muted)]">
        <span className="font-semibold text-[var(--sb-accent)]">{Math.round(score)}</span>
        <span className="text-[var(--sb-text-disabled)]">·</span>
        <span>Why this ranked</span>
        {reasons.slice(0, 3).map((r) => (
          <span
            key={r}
            className="rounded-full border border-[var(--sb-border)] bg-[var(--sb-surface)] px-2 py-0.5 text-[var(--sb-text-secondary)]"
          >
            {r}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--sb-border)] bg-[var(--sb-surface)] p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[var(--sb-text)]">Why this ranked</h3>
        <span className="text-2xl font-bold text-[var(--sb-accent)]">{Math.round(score)}</span>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="text-sm">
            <div className="mb-1 flex justify-between text-[var(--sb-text-secondary)]">
              <span>
                {row.label} <span className="text-[var(--sb-text-muted)]">({row.weight})</span>
              </span>
              <span>{Math.round(row.earned)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--sb-bg-sunken)]">
              <div
                className="h-full rounded-full bg-[var(--sb-accent)]"
                style={{ width: `${Math.min(100, (row.earned / row.weight) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {reasons.length > 0 && (
        <p className="text-xs text-[var(--sb-text-muted)]">{reasons.join(" · ")}</p>
      )}
    </div>
  );
}
