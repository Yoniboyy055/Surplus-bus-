import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BuyerPortal() {
  const supabase = createClient();
  if (!supabase) redirect("/auth");
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "buyer") {
    redirect("/dashboard");
  }

  const { data: buyerData } = await supabase
    .from("buyers")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Buyer Portal</h1>
        <div className="flex gap-2">
          <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium uppercase tracking-wider">
            Track {buyerData?.track || 'B'}
          </div>
          <div className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium uppercase tracking-wider">
            Reputation: {buyerData?.reputation_score || 50}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-semibold mb-4">My Criteria</h2>
          <p className="text-slate-400 text-sm mb-4">Define what you are looking for to get matched with surplus properties.</p>
          <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-sm font-medium">
            Update Criteria
          </button>
        </section>

        <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-semibold mb-4">Active Offers</h2>
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-800 rounded-lg text-slate-500">
            No active offers at this time
          </div>
        </section>
      </div>
    </div>
  );
}
