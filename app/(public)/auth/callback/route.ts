import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { ensureProfile } from "@/lib/auth/ensureProfile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", url.origin));
  }

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/auth?error=supabase_not_configured", url.origin));
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/auth?error=supabase_not_configured", url.origin));
  }
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/auth?error=exchange_failed", url.origin));
  }

  try {
    await ensureProfile(supabase, data.user);
  } catch (profileError) {
    console.error("Profile bootstrap failed", profileError);
    return NextResponse.redirect(new URL("/auth?error=profile_init_failed", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

