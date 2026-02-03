import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Verifies authentication for agent endpoints.
 * Accepts either:
 * 1. Authenticated operator session (for manual testing)
 * 2. Authorization: Bearer <CRON_SECRET> header (for cron calls)
 * 
 * Returns null if authorized, or a NextResponse with error if unauthorized.
 */
export async function verifyAgentAuth(request: Request): Promise<NextResponse | null> {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // Check for cron secret in Authorization header
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader?.startsWith("Bearer ") && cronSecret) {
    const providedSecret = authHeader.substring(7);
    // Use constant-time comparison to prevent timing attacks
    try {
      const providedBuffer = Buffer.from(providedSecret, "utf8");
      const secretBuffer = Buffer.from(cronSecret, "utf8");
      // Ensure buffers are same length for timingSafeEqual
      // If lengths differ, create dummy comparison to prevent timing leaks
      if (providedBuffer.length === secretBuffer.length) {
        if (timingSafeEqual(providedBuffer, secretBuffer)) {
          return null; // Authorized via cron secret
        }
      } else {
        // Length mismatch - compare with dummy to maintain constant time
        const dummyBuffer = Buffer.alloc(Math.max(providedBuffer.length, secretBuffer.length));
        timingSafeEqual(dummyBuffer, dummyBuffer);
      }
    } catch {
      // If comparison fails, fall through to operator session check
    }
  }

  // Check for authenticated operator session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "operator") {
    return NextResponse.json({ error: "Unauthorized: Operator access only" }, { status: 403 });
  }

  return null; // Authorized via operator session
}
