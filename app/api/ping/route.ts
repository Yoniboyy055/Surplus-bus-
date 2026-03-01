import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rateLimit";

/**
 * Deployment truth serum — no auth.
 * GET /api/ping
 */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, "ping", 120, 60_000);
  if (limited) return limited;

  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
}
