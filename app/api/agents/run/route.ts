import { NextRequest, NextResponse } from "next/server";
import { executeAgentRun } from "@/lib/agents/runAgentRunner";
import { timingSafeEqual } from "crypto";

/**
 * Source-driven agent runner.
 * GET /api/agents/run?parser_key=gc_buyandsell
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const parserKey = request.nextUrl.searchParams.get("parser_key");
  if (!parserKey) {
    return NextResponse.json({ error: "Missing parser_key" }, { status: 400 });
  }

  try {
    const result = await executeAgentRun(parserKey);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}

function verifyCronSecret(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provided = authHeader.slice(7);
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(cronSecret, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
