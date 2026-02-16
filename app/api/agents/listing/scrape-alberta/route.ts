/**
 * @deprecated Use GET /api/agents/run?parser_key=ab_surplus instead.
 * This route delegates to the source-driven runner.
 * Note: ab_surplus must be added to sources table for this to run.
 */
import { NextResponse } from "next/server";
import { verifyAgentAuth } from "@/lib/auth/verifyAgentAuth";
import { executeAgentRun } from "@/lib/agents/runAgentRunner";

export async function POST(request: Request) {
  const authError = await verifyAgentAuth(request);
  if (authError) return authError;

  try {
    const result = await executeAgentRun("ab_surplus");
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message: msg },
      { status: 500 }
    );
  }
}
