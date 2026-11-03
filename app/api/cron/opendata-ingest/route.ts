import { NextRequest, NextResponse } from "next/server";
import { ingestOpenDataFeeds } from "@/lib/opendata/ingest";
import { logApiStart, logApiEnd } from "@/lib/observability";

/**
 * Daily open-data ingest (OGL–Canada / OGL–NS only).
 * Auth: Authorization: Bearer CRON_SECRET (Vercel cron).
 * Skips DB writes when SUPABASE_SERVICE_ROLE_KEY is missing (reports skipped).
 * Never scrapes HTML (CanadaBuys robots Disallow:/).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { requestId, start } = logApiStart("/api/cron/opendata-ingest", null, {});
  try {
    const results = await ingestOpenDataFeeds();
    const status = results.some((r) => r.status === "error") ? 207 : 200;
    logApiEnd("/api/cron/opendata-ingest", requestId, start, status);
    return NextResponse.json({
      ok: !results.some((r) => r.status === "error"),
      results,
      note: "Apply supabase/sql/046_open_data_feeds.sql before production upserts. Attribution required in UI.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logApiEnd("/api/cron/opendata-ingest", requestId, start, 500);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
