import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** For signed-in server pages: returns the RLS client + user, or redirects to /auth. */
export async function requirePageUser(path: string) {
  const supabase = createClient();
  if (!supabase) redirect(`/auth?error=supabase_not_configured`);
  const {
    data: { user },
  } = await supabase!.auth.getUser();
  if (!user) redirect(`/auth?callbackUrl=${encodeURIComponent(path)}`);
  return { supabase: supabase!, user: user! };
}
