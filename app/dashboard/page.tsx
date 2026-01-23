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

  // FORCE OWNER REDIRECT IMMEDIATELY
  // This happens even before profile check to ensure safety/speed
  if (isOwnerEmail(data.user.email)) {
    // We still want to ensure their profile exists in the background logic of ensureProfile,
    // but we know where they are going.
    try {
      await ensureProfile(supabase, data.user);
    } catch (e) {
      console.error("Owner profile sync failed, but proceeding to /operator", e);
    }
    redirect("/operator");
  }

  try {
    const { profile } = await ensureProfile(supabase, data.user);
    
    // Standard RBAC Routing
    switch (profile.role) {
      case "operator":
        redirect("/operator");
        break;
      case "buyer":
        redirect("/buyer");
        break;
      case "referrer":
        redirect("/referrer");
        break;
      default:
        // Fallback for unknown roles
        redirect("/referrer"); 
        break;
    }
  } catch (error) {
    console.error("Profile lookup failed", error);
    // If it's a redirect error (NEXT_REDIRECT), let it pass
    if (error instanceof Error && (error.message === 'NEXT_REDIRECT' || error.message.includes('NEXT_REDIRECT'))) {
        throw error;
    }
    // Show a user-friendly error or redirect to auth
    redirect("/auth?error=profile_init_failed");
  }
}
