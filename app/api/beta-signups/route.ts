import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkSlidingWindowRateLimit, getClientIp } from "@/lib/security/ipRateLimit";
import { captureError } from "@/lib/observability/errorTracker";

const signupSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  use_case: z.string().max(120).optional().nullable(),
  website: z.string().optional(), // honeypot
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkSlidingWindowRateLimit({
    key: `beta-signups:${ip}`,
    windowMs: 60_000,
    maxHits: 10,
  });

  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited", retry_after_ms: rl.resetMs }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Honeypot should drop silently
  if (parsed.data.website !== undefined && parsed.data.website !== "") {
    return NextResponse.json({ ok: true });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, mode: "local" });
  }

  try {
    const { error } = await supabase
      .from("beta_signups")
      .upsert({ email: parsed.data.email, use_case: parsed.data.use_case ?? null }, { onConflict: "email" });

    if (error) {
      captureError("/api/beta-signups", error, { event: "upsert_failed" });
      return NextResponse.json({ error: "signup_failed" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureError("/api/beta-signups", error, { event: "unexpected_exception" });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
