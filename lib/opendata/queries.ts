/**
 * Server-only reads of the open-data tables for public pages.
 * Uses the service-role client with explicit column lists (the tables hold OGL
 * data only; no personal fields exist). Every result carries an honest state so
 * pages never fall back to fixture prices.
 */
import { computeFeedFreshness, type FeedFreshness, type FeedKey } from "./freshness";
import { toIlikePattern } from "./comps";

export type DataState<T> =
  | { state: "ok"; rows: T[]; total: number }
  | { state: "not_configured" }
  | { state: "not_migrated" }
  | { state: "error"; message: string };

export type PriceHistoryRow = {
  id: string;
  external_id: string;
  feed_key: string;
  title: string;
  sold_amount: number | null;
  closing_date: string | null;
  fiscal_year: string | null;
  province: string | null;
  city: string | null;
  category: string | null;
  kind: string | null;
  source_url: string;
  licence_id: string;
};

export type TenderRow = {
  id: string;
  external_id: string;
  reference_number: string | null;
  title: string;
  status: string;
  province: string | null;
  category: string | null;
  notice_type: string | null;
  issuing_entity: string | null;
  source_url: string;
  publication_date: string | null;
  closing_date: string | null;
  licence_id: string;
  score: number | null;
  score_reasons: string[] | null;
};

type Reader = {
  from: (t: string) => any;
};

async function reader(): Promise<Reader | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    return createServiceRoleClient() as unknown as Reader;
  } catch {
    return null;
  }
}

function classify(error: { code?: string; message?: string }): DataState<never> {
  const code = error.code || "";
  const msg = error.message || "unknown error";
  if (code === "42P01" || code === "PGRST205" || /does not exist|schema cache/i.test(msg)) {
    return { state: "not_migrated" };
  }
  console.error("[opendata] read failed:", code, msg);
  return { state: "error", message: "We couldn't load this data right now." };
}

const PROVINCES = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);
export function cleanProvince(p?: string | null): string | null {
  const v = (p || "").toUpperCase().trim();
  return PROVINCES.has(v) ? v : null;
}

export async function fetchPriceHistory(opts: {
  q?: string;
  province?: string | null;
  feed?: "gcsurplus_sold" | "ns_surplus" | null;
  limit?: number;
  offset?: number;
}): Promise<DataState<PriceHistoryRow>> {
  const db = await reader();
  if (!db) return { state: "not_configured" };
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  let query = db
    .from("price_history_lots")
    .select(
      "id,external_id,feed_key,title,sold_amount,closing_date,fiscal_year,province,city,category,kind,source_url,licence_id",
      { count: "exact" }
    );
  if (opts.q?.trim()) query = query.ilike("title", toIlikePattern(opts.q));
  const prov = cleanProvince(opts.province);
  if (prov) query = query.eq("province", prov);
  if (opts.feed) query = query.eq("feed_key", opts.feed);
  query = query.order("closing_date", { ascending: false, nullsFirst: false }).range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) return classify(error);
  return { state: "ok", rows: (data || []) as PriceHistoryRow[], total: count ?? (data || []).length };
}

/** All sold amounts matching a query (for comp statistics). Capped at 5,000. */
export async function fetchSoldAmounts(opts: {
  q: string;
  province?: string | null;
}): Promise<DataState<{ sold_amount: number | null }>> {
  const db = await reader();
  if (!db) return { state: "not_configured" };
  let query = db
    .from("price_history_lots")
    .select("sold_amount", { count: "exact" })
    .ilike("title", toIlikePattern(opts.q))
    .gt("sold_amount", 0);
  const prov = cleanProvince(opts.province);
  if (prov) query = query.eq("province", prov);
  const { data, error, count } = await query.limit(5000);
  if (error) return classify(error);
  return { state: "ok", rows: data || [], total: count ?? (data || []).length };
}

export async function fetchTenders(opts: {
  q?: string;
  province?: string | null;
  limit?: number;
  offset?: number;
}): Promise<DataState<TenderRow>> {
  const db = await reader();
  if (!db) return { state: "not_configured" };
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  let query = db
    .from("tender_notices")
    .select(
      "id,external_id,reference_number,title,status,province,category,notice_type,issuing_entity,source_url,publication_date,closing_date,licence_id,score,score_reasons",
      { count: "exact" }
    )
    .eq("status", "open");
  if (opts.q?.trim()) query = query.ilike("title", toIlikePattern(opts.q));
  const prov = cleanProvince(opts.province);
  if (prov) query = query.eq("province", prov);
  query = query.order("score", { ascending: false, nullsFirst: false }).range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) return classify(error);
  return { state: "ok", rows: (data || []) as TenderRow[], total: count ?? (data || []).length };
}

export type FeedStatus = FeedFreshness & { coverage_to: string | null };

/** Freshness per feed from open_data_ingest_runs + coverage (latest closing date). */
export async function fetchFeedStatus(
  feeds: FeedKey[]
): Promise<{ state: "ok"; feeds: Record<string, FeedStatus> } | { state: "not_configured" | "not_migrated" | "error" }> {
  const db = await reader();
  if (!db) return { state: "not_configured" };
  const { data, error } = await db
    .from("open_data_ingest_runs")
    .select("feed_key,status,retrieved_at,rows_upserted")
    .in("feed_key", feeds)
    .order("retrieved_at", { ascending: false })
    .limit(200);
  if (error) {
    const c = classify(error);
    return { state: c.state as "not_migrated" | "error" };
  }
  const out: Record<string, FeedStatus> = {};
  for (const f of feeds) {
    let coverage: string | null = null;
    if (f !== "canadabuys") {
      const { data: latest } = await db
        .from("price_history_lots")
        .select("closing_date")
        .eq("feed_key", f)
        .not("closing_date", "is", null)
        .order("closing_date", { ascending: false })
        .limit(1);
      coverage = (latest && latest[0]?.closing_date) || null;
    }
    out[f] = { ...computeFeedFreshness(data || [], f), coverage_to: coverage };
  }
  return { state: "ok", feeds: out };
}
