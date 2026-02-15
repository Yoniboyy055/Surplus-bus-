import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { verifyAgentAuth } from "@/lib/auth/verifyAgentAuth";
import { completeIngestionRun, queueCandidates, startIngestionRun } from "@/lib/agents/ingestion";

const QUEUE_CAP = 100;
const AGENT_NAME = "scrape_gc_surplus";
const SOURCE_URL = "https://gcsurplus.ca";

export async function POST(request: Request) {
  const startTime = Date.now();
  const supabase = createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const authError = await verifyAgentAuth(request);
  if (authError) {
    await logHealth(supabase, "failure", 0, 0, Date.now() - startTime, "Unauthorized");
    return authError;
  }

  const runId = await startIngestionRun(supabase, AGENT_NAME, SOURCE_URL);

  try {
    const { count: queuedCount, error: countError } = await supabase
      .from("property_candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued");

    if (countError) throw new Error(`Queue check failed: ${countError.message}`);

    if ((queuedCount ?? 0) >= QUEUE_CAP) {
      await completeIngestionRun(supabase, runId, "success", { items_found: 0, items_queued: 0 });
      await logHealth(supabase, "success", 0, 0, Date.now() - startTime, null, { reason: "queue_cap_reached", queued_count: queuedCount });
      return NextResponse.json({ ok: true, agent: AGENT_NAME, itemsFound: 0, itemsQueued: 0, message: "queue cap reached" });
    }

    const mockCandidates = [
      {
        source_platform: "gc_surplus",
        source_url: "https://gcsurplus.ca/mn-eng.cfm?snc=wfsav&sc=enc-bid&scn=12345",
        source_id: `gc-${Date.now()}-1`,
        property_data: {
          title: "Heavy Duty Lathe - Industrial",
          description: "Industrial metal lathe",
          category: "Equipment",
          location: "Ottawa, ON",
          price: 4200
        },
        quality_score: 92,
        quality_breakdown: { completeness: 20, condition: 15, liquidity: 10, source: 20 },
        bucket: "approve"
      }
    ];

    const queueResult = await queueCandidates(supabase, runId, mockCandidates);
    await completeIngestionRun(supabase, runId, "success", {
      items_found: queueResult.itemsFound,
      items_queued: queueResult.itemsQueued
    });

    await logHealth(supabase, "success", queueResult.itemsFound, queueResult.itemsQueued, Date.now() - startTime);
    return NextResponse.json({ success: true, queued: queueResult.queuedIds });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await completeIngestionRun(supabase, runId, "failure", { items_found: 0, items_queued: 0, error_message: errorMessage });
    await logHealth(supabase, "failure", 0, 0, Date.now() - startTime, errorMessage);
    return NextResponse.json({ error: "Internal server error", message: errorMessage }, { status: 500 });
  }
}

async function logHealth(
  supabase: ReturnType<typeof createClient>,
  status: "success" | "failure",
  itemsFound: number,
  itemsQueued: number,
  executionTimeMs: number,
  errorMessage: string | null = null,
  metadata?: Record<string, unknown>
) {
  if (!supabase) return;

  await supabase.from("agent_health_log").insert({
    agent_type: "listing",
    agent_name: AGENT_NAME,
    status,
    items_found: itemsFound,
    items_queued: itemsQueued,
    execution_time_ms: executionTimeMs,
    error_message: errorMessage,
    source_url: SOURCE_URL,
    metadata: metadata || null
  });
}
