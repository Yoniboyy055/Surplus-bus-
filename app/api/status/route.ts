import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logApiStart, logApiEnd } from "@/lib/observability";

/**
 * GET /api/status
 * Returns data status for the status pill (green/amber)
 */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error!;

  const { requestId, start } = logApiStart("/api/status", user?.id ?? null);

  let dataStatus: "green" | "amber" = "amber";
  let parserStatus: Array<{ parser_key: string; last_started_at: string; last_status: string }> = [];
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("source_runs")
      .select("status, completed_at")
      .eq("status", "success")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    dataStatus = data?.completed_at && new Date(data.completed_at).getTime() > cutoff ? "green" : "amber";

    const { data: raw } = await admin
      .from("source_runs")
      .select("status, started_at, sources(parser_key)")
      .order("started_at", { ascending: false })
      .limit(200);
    const byParser = new Map<string, { last_started_at: string; last_status: string }>();
    for (const r of raw || []) {
      const pk = (r.sources as { parser_key?: string })?.parser_key;
      if (pk && !byParser.has(pk)) {
        byParser.set(pk, { last_started_at: r.started_at, last_status: r.status });
      }
    }
    parserStatus = Array.from(byParser.entries()).map(([parser_key, v]) => ({
      parser_key,
      last_started_at: v.last_started_at,
      last_status: v.last_status,
    }));
  } catch {
    // Service role not configured
  }

  logApiEnd("/api/status", requestId, start, 200);

  return NextResponse.json({ dataStatus, parserStatus });
}
