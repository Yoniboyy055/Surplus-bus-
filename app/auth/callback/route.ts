import { NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { ensureProfile } from "@/lib/auth/ensureProfile";
import { createRouteHandlerClient } from "@/lib/supabase/server";

/**
 * Auth callback handler for magic-link flow.
 * 
 * IMPORTANT: This Route Handler uses NextRequest/NextResponse with explicit
 * cookie bridging to ensure session persistence. The Supabase client reads
 * cookies from the incoming request and writes auth cookies to the outgoing
 * response. Without this bridging, exchangeCodeForSession() would fail to
 * persist the session, causing authentication errors.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", url.origin));
  }

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/auth?error=supabase_not_configured", url.origin));
  }

  // Create response object early so we can write cookies to it
  const response = NextResponse.redirect(new URL(next, url.origin));

  // Create Supabase client with cookie bridging for Route Handlers
  const supabase = createRouteHandlerClient(request, response);
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

  // Return response with auth cookies set by Supabase
  return response;
}
