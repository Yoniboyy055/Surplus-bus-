import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const { data: rules } = await supabase.from("alert_rules").select("id,category").eq("profile_id", user.id);
  const ruleIds = (rules || []).map((r: any) => r.id);

  let sent = 0;
  let opened = 0;

  if (ruleIds.length > 0) {
    const { data: events } = await supabase
      .from("alert_delivery_events")
      .select("event_type,alert_rule_id")
      .in("alert_rule_id", ruleIds);

    sent = (events || []).filter((e: any) => e.event_type === "sent").length;
    opened = (events || []).filter((e: any) => e.event_type === "opened").length;
  }

  const categoryCounts = new Map<string, number>();
  for (const row of rules || []) {
    categoryCounts.set(row.category, (categoryCounts.get(row.category) || 0) + 1);
  }

  return NextResponse.json({
    alerts_sent_7d: sent,
    alerts_opened_7d: opened,
    open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
    top_categories: [...categoryCounts.entries()].map(([category, count]) => ({ category, count })),
  });
}
