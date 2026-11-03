import type { SourceMode } from "@/lib/sources/modes";

const LABELS: Record<SourceMode, string> = {
  live: "Live source",
  partial: "Partial",
  official_site_only: "Official site only",
  hook_pending: "Official site only",
};

const TITLE: Record<SourceMode, string> = {
  live: "This source produces listing-level rows from an approved feed.",
  partial: "We fetch the host page but do not yet have full lot rows.",
  official_site_only: "We can't list this site's lots here yet. Open the official site to see current listings.",
  hook_pending: "Open-data hook reserved; ingest not enabled yet. Open the official site for current listings.",
};

const CLASS: Record<SourceMode, string> = {
  live: "border-[var(--sb-source-live)]/40 text-[var(--sb-source-live)] bg-[var(--sb-success-bg)]",
  partial: "border-[var(--sb-source-partial)]/40 text-[var(--sb-source-partial)] bg-[var(--sb-info-bg)]",
  official_site_only: "border-[var(--sb-source-official)]/40 text-[var(--sb-warning)] bg-[var(--sb-warning-bg)]",
  hook_pending: "border-[var(--sb-source-official)]/40 text-[var(--sb-warning)] bg-[var(--sb-warning-bg)]",
};

export function SourceStatusBadge({
  level,
  className = "",
}: {
  level: SourceMode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${CLASS[level]} ${className}`}
      title={TITLE[level]}
    >
      {LABELS[level]}
    </span>
  );
}
