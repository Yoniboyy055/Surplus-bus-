import { NextResponse } from "next/server";
import { verifyAgentAuth } from "@/lib/auth/verifyAgentAuth";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { completeIngestionRun, queueCandidates, startIngestionRun } from "@/lib/agents/ingestion";

const QUEUE_CAP = 100;
const AGENT_NAME = "scrape_alberta_auction";
const SOURCE_URL = "https://surplus.gov.ab.ca";

export async function POST(request: Request) {
  const startTime = Date.now();

  const authError = await verifyAgentAuth(request);
  if (authError) {
    try {
      const admin = createServiceRoleClient();
      await logHealth(admin, "failure", 0, 0, Date.now() - startTime, "Unauthorized");
    } catch {
      // Ignore if service role not configured
    }
    return authError;
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Supabase service role not configured" }, { status: 500 });
  }

  const runId = await startIngestionRun(supabase, AGENT_NAME, SOURCE_URL);

  try {
    const { count: queuedCount, error: countError } = await supabase
      .from("property_candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued");

    if (countError) {
      throw new Error(`Queue check failed: ${countError.message}`);
    }

    if ((queuedCount ?? 0) >= QUEUE_CAP) {
      await completeIngestionRun(supabase, runId, "success", { items_found: 0, items_queued: 0 });
      await logHealth(supabase, "success", 0, 0, Date.now() - startTime, null, {
        reason: "queue_cap_reached",
        queued_count: queuedCount,
      });
      return NextResponse.json({
        ok: true,
        run_id: runId,
        agent: AGENT_NAME,
        itemsFound: 0,
        itemsQueued: 0,
        message: "queue cap reached",
      });
    }

    const mockCandidates = [
      {
        source_platform: "alberta_auction",
        source_url: "https://surplus.gov.ab.ca/listing/12345",
        source_id: `ab-${Date.now()}-1`,
        property_data: {
          title: "2018 Ford F-150 XLT SuperCrew",
          description: "Fleet vehicle, regularly maintained.",
          category: "Vehicles",
          location: "Edmonton, AB",
          price: 18500,
        },
        quality_score: 85,
        quality_breakdown: { completeness: 20, condition: 15, liquidity: 10, source: 15 },
        bucket: "approve",
      },
    ];

    const queueResult = await queueCandidates(supabase, runId, mockCandidates);
    await completeIngestionRun(supabase, runId, "success", {
      items_found: queueResult.itemsFound,
      items_queued: queueResult.itemsQueued,
    });

    await logHealth(supabase, "success", queueResult.itemsFound, queueResult.itemsQueued, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      run_id: runId,
      queued: queueResult.queuedIds,
      itemsFound: queueResult.itemsFound,
      itemsQueued: queueResult.itemsQueued,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await completeIngestionRun(supabase, runId, "failure", {
      items_found: 0,
      items_queued: 0,
      error_message: errorMessage,
    });
    await logHealth(supabase, "failure", 0, 0, Date.now() - startTime, errorMessage);
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

async function logHealth(
  supabase: ReturnType<typeof createServiceRoleClient>,
  status: "success" | "failure",
  itemsFound: number,
  itemsQueued: number,
  executionTimeMs: number,
  errorMessage: string | null = null,
  metadata?: Record<string, unknown>
) {
  await supabase.from("agent_health_log").insert({
    agent_type: "listing",
    agent_name: AGENT_NAME,
    status,
    items_found: itemsFound,
    items_queued: itemsQueued,
    execution_time_ms: executionTimeMs,
    error_message: errorMessage,
    source_url: SOURCE_URL,
    metadata: metadata || null,
  });
}
