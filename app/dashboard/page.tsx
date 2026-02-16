import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/auth/ensureProfile";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/ownerEmail";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    redirect("/auth?error=supabase_not_configured");
  }

  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  if (isOwnerEmail(data.user.email)) {
    try {
      await ensureProfile(supabase, data.user);
    } catch (e) {
      console.error("Owner profile sync failed", e);
    }
    redirect("/ops");
  }

  try {
    const { profile } = await ensureProfile(supabase, data.user);
    if (profile.role === "operator") {
      redirect("/ops");
    }
  } catch (error) {
    console.error("Profile lookup failed", error);
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.message.includes("NEXT_REDIRECT"))) {
      throw error;
    }
    redirect("/auth?error=profile_init_failed");
  }

  return <DashboardClient />;
}
