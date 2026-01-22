import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Fetch recent logs
  const { data: logs } = await supabase
    .from('agent_health_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  // 2. Calculate metrics
  const totalRuns = logs?.length || 0;
  const failures = logs?.filter(l => l.status === 'failure').length || 0;
  const successRate = totalRuns > 0 ? ((totalRuns - failures) / totalRuns) * 100 : 100;
  
  const itemsQueuedLast24h = logs
    ?.filter(l => new Date(l.created_at).getTime() > Date.now() - 86400000)
    .reduce((sum, l) => sum + (l.items_queued || 0), 0) || 0;

  return NextResponse.json({
    health: {
      success_rate: Math.round(successRate),
      status: successRate > 90 ? 'healthy' : successRate > 70 ? 'degraded' : 'critical',
      last_run: logs?.[0]?.created_at || null,
      items_queued_24h: itemsQueuedLast24h
    },
    recent_logs: logs
  });
}
