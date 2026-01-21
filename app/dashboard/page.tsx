import { redirect } from "next/navigation";

import { ensureProfile } from "@/lib/auth/ensureProfile";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    redirect("/auth?error=supabase_not_configured");
  }

  const supabase = createClient();
  if (!supabase) {
    redirect("/auth?error=supabase_not_configured");
  }
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/auth");
  }

  try {
    const { profile } = await ensureProfile(supabase, data.user);
    
    // Redirect based on role
    switch (profile.role) {
      case "operator":
        redirect("/operator");
      case "referrer":
        redirect("/referrer");
      case "buyer":
        redirect("/buyer");
      default:
        redirect("/");
    }
  } catch (error) {
    console.error("Profile lookup failed", error);
    redirect("/auth?error=profile_lookup_failed");
  }
}
