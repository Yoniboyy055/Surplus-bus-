import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { ensureProfile } from "@/lib/auth/ensureProfile";
import { sanitizeRedirectPath } from "@/lib/auth/sanitizeRedirect";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeRedirectPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", url.origin));
  }

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/auth?error=supabase_not_configured", url.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/auth?error=supabase_not_configured", url.origin));
  }

  // Create redirect response FIRST so we can attach session cookies to it.
  // Route Handlers cannot use cookies().set() - we must write cookies to the Response.
  const redirectUrl = new URL(next, url.origin);
  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        } catch (err) {
          console.error("[Auth] Cookie write failed in callback:", err);
          throw err;
        }
      },
    },
  });

  let result: Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>;
  try {
    result = await supabase.auth.exchangeCodeForSession(code);
  } catch (err) {
    console.error("[Auth] Callback failed (cookie write or exchange):", err);
    return NextResponse.redirect(new URL("/auth?error=cookie_write_failed", url.origin));
  }

  if (result.error || !result.data.user) {
    return NextResponse.redirect(new URL("/auth?error=exchange_failed", url.origin));
  }

  try {
    await ensureProfile(supabase, result.data.user);
  } catch (profileError) {
    console.error("[Auth] Profile bootstrap failed:", profileError);
    return NextResponse.redirect(new URL("/auth?error=profile_init_failed", url.origin));
  }

  return response;
}
