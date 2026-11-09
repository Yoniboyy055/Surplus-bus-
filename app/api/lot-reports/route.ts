import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { lotReportInput, REPORTS_PER_LOT_PER_DAY } from "@/lib/opendata/lotReports";

/**
 * POST /api/lot-reports — anonymous "report a wrong result" for one sold lot.
 * Stores only: which lot, a reason, an optional suggested kind and an optional short note
 * (contact details are refused). No account, email, IP or user agent is stored; the IP is used
 * only in memory/Redis for rate limiting. Table: public.lot_reports (migration 057).
 */
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  // Same-origin form posts only.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) return json({ error: "forbidden" }, 403);
    } catch {
      return json({ error: "forbidden" }, 403);
    }
  }
  const limited = await checkRateLimit(request, "lot-reports", 6, 10 * 60_000);
  if (limited) return limited;

  const raw = await request.json().catch(() => null);
  const parsed = lotReportInput.safeParse(raw);
  if (!parsed.success) {
    const contact = parsed.error.issues.some((i) => i.message === "contact_details");
    return json({ error: contact ? "contact_details" : "invalid" }, 400);
  }
  const r = parsed.data;
  if (r.website) return json({ ok: true }, 201); // honeypot: pretend success, store nothing

  let db: any = null;
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    db = createServiceRoleClient();
  } catch {
    db = null;
  }
  if (!db) return json({ error: "not_enabled" }, 503);

  const lot = await db.from("price_history_lots").select("id").eq("feed_key", r.feed_key).eq("external_id", r.external_id).limit(1);
  if (lot.error) return json({ error: "unavailable" }, 503);
  if (!lot.data?.length) return json({ error: "not_found" }, 404);

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await db
    .from("lot_reports")
    .select("id", { count: "exact", head: true })
    .eq("feed_key", r.feed_key)
    .eq("external_id", r.external_id)
    .gte("created_at", since);
  if (recent.error) {
    const missing = recent.error.code === "42P01" || recent.error.code === "PGRST205" || /does not exist|schema cache/i.test(recent.error.message || "");
    return json({ error: missing ? "not_enabled" : "unavailable" }, 503);
  }
  if ((recent.count ?? 0) >= REPORTS_PER_LOT_PER_DAY) return json({ error: "enough_reports" }, 429);

  const ins = await db.from("lot_reports").insert({
    feed_key: r.feed_key,
    external_id: r.external_id,
    reason: r.reason,
    suggested_kind: r.suggested_kind ?? null,
    note: r.note ? r.note : null,
  });
  if (ins.error) return json({ error: "unavailable" }, 503);
  return json({ ok: true }, 201);
}
