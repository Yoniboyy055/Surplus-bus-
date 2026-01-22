import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/auth/ensureProfile";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/ownerEmail";

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
    // Force owner to operator dashboard regardless of what DB says initially (though ensureProfile should fix it)
    if (isOwnerEmail(data.user.email)) {
        redirect("/operator");
    }

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
    // If it's a redirect error (NEXT_REDIRECT), let it pass
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        throw error;
    }
    redirect("/auth?error=profile_lookup_failed");
  }
}
