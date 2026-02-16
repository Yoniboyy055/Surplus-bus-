import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

/**
 * GET /api/status
 * Returns data status for the status pill (green/amber)
 */
export async function GET() {
  const { error } = await requireUser();
  if (error) return error!;

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

  return NextResponse.json({ dataStatus });
}
