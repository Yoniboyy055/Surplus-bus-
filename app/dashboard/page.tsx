import { redirect } from "next/navigation";

import { ensureProfile } from "@/lib/auth/ensureProfile";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/auth");
  }

  let role = "buyer";

  try {
    const { profile } = await ensureProfile(supabase, data.user);
    role = profile.role;
  } catch (error) {
    console.error("Profile lookup failed", error);
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-slate-300">Authenticated access only.</p>
      </div>
      <div className="rounded border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
        <div>
          <span className="text-slate-400">User ID:</span> {data.user.id}
        </div>
        <div>
          <span className="text-slate-400">Role:</span> {role}
        </div>
      </div>
    </section>
  );
}
