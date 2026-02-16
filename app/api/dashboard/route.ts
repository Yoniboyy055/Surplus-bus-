import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

/**
 * GET /api/dashboard
 * KPIs, last 10 source_runs, last 10 opportunities
 * Uses service_role for source_runs (RLS is operator-only; we need status for all users)
 */
export async function GET() {
  const { supabase, error } = await requireUser();
  if (error || !supabase) return error!;

  // Opportunities: user's anon client (RLS allows authenticated read)
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title, province, category, source, estimated_value, closing_date, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  // source_runs: service_role (RLS blocks anon; we only expose status/timestamps)
  let runs: Array<{ id: string; status: string; started_at: string; completed_at: string | null; items_found: number; items_upserted: number }> = [];
  let dataStatus: "green" | "amber" = "amber";
  try {
    const admin = createServiceRoleClient();
    const { data: runRows } = await admin
      .from("source_runs")
      .select("id, status, started_at, completed_at, items_found, items_upserted")
      .order("started_at", { ascending: false })
      .limit(10);
    runs = runRows || [];
    const lastSuccess = runs.find((r) => r.status === "success" && r.completed_at != null);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    dataStatus =
      lastSuccess?.completed_at && new Date(lastSuccess.completed_at).getTime() > cutoff ? "green" : "amber";
  } catch {
    // Service role not configured
  }

  return NextResponse.json({
    opportunities: opportunities || [],
    runs,
    dataStatus,
  });
}
