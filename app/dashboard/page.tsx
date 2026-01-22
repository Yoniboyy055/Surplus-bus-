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
    
    console.log(`Dashboard Redirect: uid=${data.user.id}, email=${data.user.email}, role=${profile.role}`);

    // Redirect based on role
    switch (profile.role) {
      case "operator":
        redirect("/operator");
        break;
      case "referrer":
        redirect("/referrer");
        break;
      case "buyer":
        redirect("/buyer");
        break;
      default:
        redirect("/");
        break;
    }
  } catch (error) {
    console.error("Profile lookup failed", error);
    // If we can't get the profile, we can't route them.
    // But ensureProfile should have created it.
    // If it's a redirect error (NEXT_REDIRECT), let it pass
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        throw error;
    }
    redirect("/auth?error=profile_lookup_failed");
  }
}
