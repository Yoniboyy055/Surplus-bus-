import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ReferrerPortal() {
  const supabase = createClient();
  if (!supabase) redirect("/auth");
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "referrer") {
    redirect("/dashboard");
  }

  const { data: referrerData } = await supabase
    .from("referrers")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Referrer Portal</h1>
        <div className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium uppercase tracking-wider">
          {referrerData?.tier || 'Starter'} Tier
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-slate-400 text-sm font-medium">Points Earned</h3>
          <p className="text-2xl font-bold mt-2">{referrerData?.points_closed_paid || 0}</p>
        </div>
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-slate-400 text-sm font-medium">Commission Rate</h3>
          <p className="text-2xl font-bold mt-2">{referrerData?.commission_rate || 20}%</p>
        </div>
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-slate-400 text-sm font-medium">Total Referrals</h3>
          <p className="text-2xl font-bold mt-2">--</p>
        </div>
      </div>

      <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
        <h2 className="text-xl font-semibold mb-4">Referral Links</h2>
        <div className="flex gap-4">
          <input 
            type="text" 
            readOnly 
            value="https://surplus-bus.com/ref/your-code" 
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-400"
          />
          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition text-sm font-medium">
            Copy Link
          </button>
        </div>
      </section>
    </div>
  );
}
