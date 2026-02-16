import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AnalyticsPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  const { count: oppCount } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true });

  const { count: runCount } = await supabase
    .from("ingestion_runs")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">Analytics</h1>
      <p className="text-quantum-400">High-level insights and metrics.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-quantum-200 mb-2">Opportunities</h2>
          <p className="text-3xl font-bold text-quantum-50">{oppCount ?? 0}</p>
          <p className="text-sm text-quantum-500 mt-1">Total in database</p>
        </div>
        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-quantum-200 mb-2">Ingestion runs</h2>
          <p className="text-3xl font-bold text-quantum-50">{runCount ?? 0}</p>
          <p className="text-sm text-quantum-500 mt-1">Total runs</p>
        </div>
      </div>

      <p className="text-quantum-500 text-sm">
        More analytics and charts will be added in a future release.
      </p>
      <Link href="/opportunities" className="text-cyan-400 hover:text-cyan-300 text-sm">
        Browse opportunities →
      </Link>
    </div>
  );
}
