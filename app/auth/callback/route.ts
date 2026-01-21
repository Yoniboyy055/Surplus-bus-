import { NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { ensureProfile } from "@/lib/auth/ensureProfile";
import { routeByRole } from "@/lib/auth/routeByRole";
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
  const next = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", url.origin));
  }

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/auth?error=supabase_not_configured", url.origin));
  }

  // We need to create the final redirect response first, then use it for cookie bridging
  // This ensures cookies set during exchangeCodeForSession are included in the response
  let redirectPath = "/dashboard"; // temporary default
  
  // Create a temporary response for cookie operations
  const tempResponse = NextResponse.next();
  
  // Create Supabase client with cookie bridging for Route Handlers
  const supabase = createRouteHandlerClient(request, tempResponse);
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

  // Determine redirect: use 'next' param if provided, otherwise route by role
  if (next) {
    redirectPath = next;
  } else {
    redirectPath = await routeByRole(supabase, data.user.id);
  }

  // Create final redirect response and copy cookies from temp response
  const finalResponse = NextResponse.redirect(new URL(redirectPath, url.origin));
  
  // Copy all cookies from temp response to final response
  tempResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });

  return finalResponse;
}
