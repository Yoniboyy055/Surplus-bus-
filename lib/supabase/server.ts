import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

export const createClient = () => {
  if (!env) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch (err) {
          // In Route Handlers, cookies().set() throws – use auth callback pattern instead.
          // In Server Components, this can occur; middleware refreshes sessions.
          console.error("[Supabase] Cookie write failed (setAll):", err);
          // Do not swallow: log for visibility. If this appears in auth flows, fix the callback.
        }
      },
    },
  });
};
