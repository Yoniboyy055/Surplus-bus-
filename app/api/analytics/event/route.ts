import { NextRequest, NextResponse } from "next/server";
import { EVENTS } from "@/lib/analytics/catalog";
import { analyticsEnabled, isEventName, track } from "@/lib/analytics/track";
import { checkRateLimit } from "@/lib/security/rateLimit";

/** Client beacon for the catalogue's client-side events only. No auth, no PII, rate-limited. */
export async function POST(request: NextRequest) {
  if (!analyticsEnabled()) return new NextResponse(null, { status: 204 });
  const limited = await checkRateLimit(request, "analytics", 60, 60_000);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const name = body?.event;
  if (!isEventName(name) || EVENTS[name].source === "server") {
    return NextResponse.json({ error: "unknown_event" }, { status: 400 });
  }
  await track(name, body?.props, { sessionId: typeof body?.session_id === "string" ? body.session_id : null });
  return new NextResponse(null, { status: 204 });
}
