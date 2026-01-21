import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function BuyerPage() {
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

  // Fetch role to verify access
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Buyer Portal</h1>
        <p className="text-slate-300">Browse and commit to deals.</p>
      </div>
      <div className="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        <div>
          <span className="text-slate-400">Role:</span> {profile?.role || "unknown"}
        </div>
        <div>
          <span className="text-slate-400">Email:</span> {data.user.email}
        </div>
      </div>
    </section>
  );
}
