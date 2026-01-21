import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OperatorPortal() {
  const supabase = createClient();
  if (!supabase) redirect("/auth");
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "operator") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Operator Portal</h1>
        <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium uppercase tracking-wider">
          System Administrator
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-slate-400 text-sm font-medium">Active Deals</h3>
          <p className="text-2xl font-bold mt-2">--</p>
        </div>
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-slate-400 text-sm font-medium">Pending Payouts</h3>
          <p className="text-2xl font-bold mt-2">--</p>
        </div>
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <h3 className="text-slate-400 text-sm font-medium">New Submissions</h3>
          <p className="text-2xl font-bold mt-2">--</p>
        </div>
      </div>

      <section className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
        <h2 className="text-xl font-semibold mb-4">Deal Pipeline</h2>
        <div className="flex items-center justify-center h-48 border-2 border-dashed border-slate-800 rounded-lg text-slate-500">
          Pipeline Visualization Coming Soon
        </div>
      </section>
    </div>
  );
}
