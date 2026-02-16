import { createClient } from "@supabase/supabase-js";

/**
 * Service role client — bypasses RLS. Use ONLY on the server for:
 * - Agent/cron writes (ingestion_runs, ingestion_failures, opportunities, etc.)
 * - Profile bootstrap in ensureProfile
 *
 * NEVER expose this client to the browser.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("createServiceRoleClient: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
