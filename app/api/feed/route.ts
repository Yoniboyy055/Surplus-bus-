import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

/**
 * GET /api/feed
 * Last 50 opportunity_events with joined opportunity summary
 */
export async function GET() {
  const { supabase, error } = await requireUser();
  if (error || !supabase) return error!;

  const { data, error: fetchError } = await supabase
    .from("opportunity_events")
    .select(`
      id, event_type, diff, detected_at,
      opportunities(id, title, province, category, source)
    `)
    .order("detected_at", { ascending: false })
    .limit(50);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  return NextResponse.json({
    events: data || [],
  });
}
