import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { ensureProfile } from "@/lib/auth/ensureProfile";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/app/components/AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
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

  const { profile } = await ensureProfile(supabase, data.user);

  return (
    <AppShell userEmail={data.user.email ?? null} role={profile.role}>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        {children}
      </main>
    </AppShell>
  );
}

