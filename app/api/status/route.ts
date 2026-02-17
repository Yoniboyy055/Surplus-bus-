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
  } catch {
    // Service role not configured
  }

  logApiEnd("/api/status", requestId, start, 200);

  return NextResponse.json({ dataStatus });
}
