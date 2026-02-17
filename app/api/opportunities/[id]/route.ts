import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { logApiStart, logApiEnd } from "@/lib/observability";

/**
 * GET /api/opportunities/[id]
 * Returns opportunity + last 20 events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user, error } = await requireUser();
  if (error || !supabase) return error!;

  const { requestId, start } = logApiStart("/api/opportunities/[id]", user?.id ?? null, { id });

  const { data: opp, error: oppError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .single();

  if (oppError || !opp) {
    logApiEnd("/api/opportunities/[id]", requestId, start, 404);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: events } = await supabase
    .from("opportunity_events")
    .select("id, event_type, diff, detected_at")
    .eq("opportunity_id", id)
    .order("detected_at", { ascending: false })
    .limit(20);

  logApiEnd("/api/opportunities/[id]", requestId, start, 200);

  return NextResponse.json({
    opportunity: opp,
    events: events || [],
  });
}
