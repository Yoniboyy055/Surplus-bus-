import { createBrowserClient } from "@supabase/ssr";

import { env, isSupabaseConfigured } from "@/lib/env";

export const createClient = () => {
  // Prefer the validated env, but fall back to raw vars if only the full
  // schema parse failed (e.g. missing RESEND_API_KEY) while Supabase vars
  // are present and valid.
  const url = env?.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured || !url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
};
