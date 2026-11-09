/**
 * Dataset freshness for the open-data feeds. Used by /price-history, /tenders
 * and /api/status so the UI never presents stale data as current.
 * SLAs follow the publishers' update cadence (docs/CRON_PLAN.md).
 */
export type FeedKey = "gcsurplus_sold" | "canadabuys" | "ns_surplus";

export const FEED_SLA_DAYS: Record<FeedKey, number> = {
  // GCSurplus "What has sold" is published as half-year ZIPs.
  gcsurplus_sold: 200,
  // CanadaBuys open tender notices CSV is refreshed daily.
  canadabuys: 2,
  // NS Crown surplus history is updated irregularly (monthly at best).
  ns_surplus: 45,
};

export type IngestRunLite = {
  feed_key: string;
  status: "ok" | "error" | "skipped" | string;
  retrieved_at: string;
  rows_upserted?: number | null;
};

export type FeedFreshness = {
  feed_key: FeedKey;
  state: "fresh" | "stale" | "failing" | "never";
  last_ok_at: string | null;
  age_days: number | null;
  last_status: string | null;
  sla_days: number;
};

export function computeFeedFreshness(
  runs: IngestRunLite[],
  feed: FeedKey,
  now: Date = new Date()
): FeedFreshness {
  const sla = FEED_SLA_DAYS[feed];
  const mine = runs
    .filter((r) => r.feed_key === feed)
    .sort((a, b) => Date.parse(b.retrieved_at) - Date.parse(a.retrieved_at));
  const lastOk = mine.find((r) => r.status === "ok") ?? null;
  const latest = mine[0] ?? null;
  const ageDays = lastOk ? (now.getTime() - Date.parse(lastOk.retrieved_at)) / 86_400_000 : null;
  let state: FeedFreshness["state"];
  if (!lastOk) state = latest ? "failing" : "never";
  else if (ageDays! > sla) state = "stale";
  else if (latest && latest.status === "error") state = "failing";
  else state = "fresh";
  return {
    feed_key: feed,
    state,
    last_ok_at: lastOk?.retrieved_at ?? null,
    age_days: ageDays == null ? null : Math.round(ageDays * 10) / 10,
    last_status: latest?.status ?? null,
    sla_days: sla,
  };
}

export function describeFreshness(f: FeedFreshness): string {
  if (f.state === "never") return "Not loaded yet";
  const when = f.last_ok_at
    ? new Date(f.last_ok_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
    : "never";
  if (f.state === "stale") return `Stale: last refreshed ${when} (expected every ${f.sla_days} days)`;
  if (f.state === "failing") return `Last refresh failed; showing data from ${when}`;
  return `Refreshed ${when}`;
}
