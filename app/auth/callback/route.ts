import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isSupabaseConfigured, env } from "@/lib/env";
import { ensureProfile } from "@/lib/auth/ensureProfile";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", requestUrl.origin));
  }

  if (!isSupabaseConfigured || !env) {
    return NextResponse.redirect(new URL("/auth?error=supabase_not_configured", requestUrl.origin));
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("Auth exchange failed:", error);
    return NextResponse.redirect(new URL("/auth?error=exchange_failed", requestUrl.origin));
  }

  try {
    await ensureProfile(supabase, data.user);
  } catch (profileError) {
    console.error("Profile bootstrap failed", profileError);
    return NextResponse.redirect(new URL("/auth?error=profile_init_failed", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
