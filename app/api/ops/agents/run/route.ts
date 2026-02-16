import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth/requireUser";
import { executeAgentRun } from "@/lib/agents/runAgentRunner";

/**
 * Manual trigger for agent runs (operator only).
 * POST /api/ops/agents/run
 * Body: { parser_key: "gc_buyandsell" } or query ?parser_key=gc_buyandsell
 */
export async function POST(request: NextRequest) {
  const { error } = await requireOperator();
  if (error) return error;

  let parserKey: string | null = null;
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      parserKey = body?.parser_key ?? null;
    } catch {
      // Ignore
    }
  }
  if (!parserKey) {
    parserKey = request.nextUrl.searchParams.get("parser_key");
  }

  if (!parserKey) {
    return NextResponse.json(
      { error: "Missing parser_key (body or query)" },
      { status: 400 }
    );
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
