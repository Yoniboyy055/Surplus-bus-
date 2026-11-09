import Link from "next/link";

/** Small, quiet "Report" link on a result row: opens a one-question form for this lot. */
export function ReportLink({ feedKey, externalId, title }: { feedKey: string; externalId: string; title: string }) {
  const href = `/report?${new URLSearchParams({ feed: feedKey, id: externalId }).toString()}`;
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex min-h-[28px] items-center whitespace-nowrap text-xs text-[var(--sb-ink-soft)] underline decoration-dotted underline-offset-2 hover:text-[var(--sb-accent-700)]"
      data-testid="report-link"
    >
      Report<span className="sr-only"> a wrong result: {title}</span>
    </Link>
  );
}
