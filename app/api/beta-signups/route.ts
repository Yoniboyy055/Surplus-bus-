import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const betaSignupSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  use_case: z.string().max(120).optional().nullable(),
  website: z.string().optional(), // honeypot
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = betaSignupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (parsed.data.website !== undefined && parsed.data.website !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, mode: "local" }, { status: 200 });
  }

  const { error } = await supabase
    .from("beta_signups")
    .upsert({ email: parsed.data.email, use_case: parsed.data.use_case ?? null }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ ok: false, error: "signup_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
