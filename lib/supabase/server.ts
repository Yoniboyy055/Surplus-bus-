import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

export const createClient = () => {
  if (!env) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Ignore if cookies cannot be set from the current context.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Ignore if cookies cannot be set from the current context.
        }
      },
    },
  });
};

/**
 * Creates a Supabase client for Route Handlers with proper cookie bridging.
 * 
 * Route Handlers require explicit request/response cookie handling because
 * the `cookies()` helper from next/headers only reads from the request and
 * cannot write to the response. This function bridges cookies from the
 * incoming request and ensures any auth cookies set by Supabase are written
 * to the outgoing response, which is essential for session persistence.
 * 
 * @param request - The incoming NextRequest
 * @param response - The NextResponse to write cookies to
 * @returns Supabase client configured for Route Handler cookie operations
 */
export const createRouteHandlerClient = (request: NextRequest, response: NextResponse) => {
  if (!env) {
    return null;
  }

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });
};
