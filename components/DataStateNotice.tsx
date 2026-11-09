import Link from "next/link";
import type { FeedStatus } from "@/lib/opendata/queries";
import { describeFreshness } from "@/lib/opendata/freshness";

/** Honest banner for non-ok data states. Never renders sample prices. */
export function DataStateNotice({
  state,
  what,
}: {
  state: "not_configured" | "not_migrated" | "error";
  what: string;
}) {
  const copy = {
    not_configured: {
      title: `${what} isn't connected in this environment`,
      body: "This deployment has no database connection, so no prices are shown. Nothing here is sample data.",
      role: "note" as const,
    },
    not_migrated: {
      title: `${what} is being set up`,
      body: "The open-data tables haven't been created yet. Prices appear after the first ingest. We never show placeholder prices.",
      role: "note" as const,
    },
    error: {
      title: `We couldn't load ${what.toLowerCase()} right now`,
      body: "Please try again in a minute. If it keeps happening, check the status page.",
      role: "alert" as const,
    },
  }[state];
  return (
    <div className={`banner ${state === "error" ? "danger" : ""}`} role={copy.role} data-state={state}>
      <strong className="block text-[var(--sb-ink)]">{copy.title}</strong>
      <span className="text-sm text-[var(--sb-ink-soft)]">{copy.body}</span>{" "}
      {state === "error" && (
        <Link href="/api/status" className="text-sm text-[var(--sb-accent-700)] underline">
          Status
        </Link>
      )}
    </div>
  );
}

export function FeedFreshnessChip({ status, label }: { status?: FeedStatus; label: string }) {
  if (!status) return null;
  const tone =
    status.state === "fresh"
      ? "!bg-[var(--sb-success-bg)] !text-[var(--sb-ok)]"
      : status.state === "never"
        ? ""
        : "!bg-[var(--sb-warning-bg)] !text-[var(--sb-ink)]";
  const coverage = status.coverage_to
    ? ` · covers sales to ${new Date(status.coverage_to + "T00:00:00Z").toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}`
    : "";
  return (
    <span className={`chip ${tone}`} data-feed={status.feed_key} data-freshness={status.state}>
      <strong>{label}</strong>&nbsp;{describeFreshness(status)}
      {coverage}
    </span>
  );
}
