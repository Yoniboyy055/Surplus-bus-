import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";

function createSupabaseRouteClient() {
  const cookieStore = cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}

export async function POST(request: Request) {
  if (!env) {
    return NextResponse.redirect(new URL("/auth?error=supabase_not_configured", request.url));
  }
  const supabase = createSupabaseRouteClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth", request.url));
}

export async function GET(request: Request) {
  return POST(request);
}

