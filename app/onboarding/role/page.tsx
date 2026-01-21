import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingRolePage() {
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

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Select Your Role</h1>
        <p className="text-slate-300">Choose your account type to continue.</p>
      </div>
      <div className="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        <div>
          <span className="text-slate-400">Email:</span> {data.user.email}
        </div>
        <div className="mt-4">
          <p className="text-slate-400">Role selection UI placeholder.</p>
          <p className="text-slate-400">Options: Operator, Buyer, Referrer</p>
        </div>
      </div>
    </section>
  );
}
