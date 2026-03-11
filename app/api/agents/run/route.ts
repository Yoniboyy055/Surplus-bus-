import { NextRequest, NextResponse } from "next/server";
import { executeAgentRun, AgentRunError } from "@/lib/agents/runAgentRunner";
import { logApiStart, logApiEnd } from "@/lib/observability";

/**
 * TO RE-ENABLE A SOURCE FOR PRODUCTION:
 * 1. Fix the parser (correct selectors, real external_id extraction)
 * 2. Run: runSourceQualification(sourceId) — must pass all 5 gates twice
 * 3. DB will auto-set production_ready=true after qualification
 * 4. Source will then be picked up on next cron run
 *
 * DO NOT manually set production_ready=true without running qualification.
 */

/**
 * Source-driven agent runner.
 * GET /api/agents/run?parser_key=gc_buyandsell
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  console.log('[agents/run] CRON_SECRET defined:', !!process.env.CRON_SECRET);
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const parserKey = request.nextUrl.searchParams.get("parser_key");
  if (!parserKey) {
    return NextResponse.json({ error: "Missing parser_key" }, { status: 400 });
  }

  const { requestId, start } = logApiStart("/api/agents/run", null, { parser_key: parserKey });

  try {
    const result = await executeAgentRun(parserKey);
    logApiEnd("/api/agents/run", requestId, start, 200);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AgentRunError) {
      logApiEnd("/api/agents/run", requestId, start, err.statusCode);
      return NextResponse.json({ error: err.code }, { status: err.statusCode });
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    logApiEnd("/api/agents/run", requestId, start, 500);
    return NextResponse.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}
