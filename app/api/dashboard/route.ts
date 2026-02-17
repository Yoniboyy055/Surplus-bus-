import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { logApiStart, logApiEnd } from "@/lib/observability";

/**
 * GET /api/dashboard
 * KPIs, last 10 source_runs, last 10 opportunities, last 24h failures
 * Uses service_role for source_runs (RLS is operator-only; we need status for all users)
 */
export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase) return error!;

  const { requestId, start } = logApiStart("/api/dashboard", user?.id ?? null);

  // Opportunities: user's anon client (RLS allows authenticated read)
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title, province, category, source, estimated_value, closing_date, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  // source_runs + failures: service_role (RLS blocks anon)
  let runs: Array<{ id: string; status: string; started_at: string; completed_at: string | null; items_found: number; items_upserted: number }> = [];
  let failures: Array<{ id: string; agent_name: string; error_message: string | null; started_at: string }> = [];
  let dataStatus: "green" | "amber" = "amber";

  try {
    const admin = createServiceRoleClient();
    const { data: runRows } = await admin
      .from("source_runs")
      .select("id, agent_name, status, started_at, completed_at, items_found, items_upserted, error_message")
      .order("started_at", { ascending: false })
      .limit(10);
    runs = (runRows || []).map((r) => ({
      id: r.id,
      status: r.status,
      started_at: r.started_at,
      completed_at: r.completed_at,
      items_found: r.items_found,
      items_upserted: r.items_upserted,
    }));

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: failRows } = await admin
      .from("source_runs")
      .select("id, agent_name, error_message, started_at")
      .eq("status", "failure")
      .gte("started_at", cutoff)
      .order("started_at", { ascending: false })
      .limit(20);
    failures = (failRows || []).map((f) => ({
      id: f.id,
      agent_name: f.agent_name,
      error_message: f.error_message,
      started_at: f.started_at,
    }));

    const lastSuccess = runs.find((r) => r.status === "success" && r.completed_at != null);
    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
    dataStatus =
      lastSuccess?.completed_at && new Date(lastSuccess.completed_at).getTime() > cutoffMs ? "green" : "amber";
  } catch {
    // Service role not configured
  }

  logApiEnd("/api/dashboard", requestId, start, 200);

  return NextResponse.json({
    opportunities: opportunities || [],
    runs,
    failures,
    dataStatus,
  });
}
