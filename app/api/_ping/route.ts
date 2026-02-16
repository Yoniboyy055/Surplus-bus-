import { NextResponse } from "next/server";

/**
 * Deployment truth serum — no auth.
 * GET /api/_ping
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
}
