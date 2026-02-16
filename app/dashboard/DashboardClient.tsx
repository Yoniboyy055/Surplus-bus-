"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { LayoutDashboard, Rss, Target } from "lucide-react";

type DashboardData = {
  opportunities: Array<{
    id: string;
    title: string;
    province: string;
    category: string | null;
    source: string;
    estimated_value: number | null;
    closing_date: string | null;
    created_at: string;
  }>;
  runs: Array<{
    id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    items_found: number;
    items_upserted: number;
  }>;
  dataStatus: "green" | "amber";
};

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { count } = await supabase
        .from("alert_rules")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("is_active", true);
      setAlertCount(count ?? 0);

      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, supabase]);

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading dashboard...</div>;
  if (error) return <div className="text-center py-20 text-accent-danger">{error}</div>;

  const hasAlerts = alertCount > 0;
  const opps = data?.opportunities ?? [];
  const runs = data?.runs ?? [];
  const status = data?.dataStatus ?? "amber";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-quantum-50">Dashboard</h1>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            status === "green" ? "bg-accent-success/20 text-accent-success" : "bg-amber-500/20 text-amber-400"
          }`}
        >
          Data {status === "green" ? "fresh" : "stale"}
        </span>
      </div>
      <p className="text-quantum-400 -mt-6">Your intelligence hub for surplus and RFP opportunities.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-quantum-200 mb-2">Alerts</h2>
          {hasAlerts ? (
            <p className="text-quantum-400 text-sm">
              You have {alertCount} active alert{alertCount === 1 ? "" : "s"}. Matches will appear in your inbox.
            </p>
          ) : (
            <p className="text-quantum-500 text-sm mb-4">Set up alerts to get started.</p>
          )}
          <Link href="/alerts" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
            {hasAlerts ? "Manage alerts" : "Create your first alert"} →
          </Link>
        </div>

        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-quantum-200 mb-2">Ingestion</h2>
          {runs.length > 0 ? (
            <p className="text-quantum-400 text-sm">
              Last run: {runs[0]?.status} — {runs[0]?.items_upserted ?? 0} items upserted
            </p>
          ) : (
            <p className="text-quantum-500 text-sm">No runs yet.</p>
          )}
          <Link href="/feed" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium mt-2 inline-block">
            View feed →
          </Link>
        </div>
      </div>

      {opps.length > 0 && (
        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-quantum-200 mb-4">Recent opportunities</h2>
          <ul className="space-y-3">
            {opps.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/opportunities/${o.id}`}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  {o.title}
                </Link>
                <p className="text-quantum-500 text-xs mt-0.5">
                  {o.province} · {o.category || "—"} · {o.source}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/opportunities" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium mt-4 inline-block">
            Browse all →
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <Link
          href="/opportunities"
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition flex items-center gap-2"
        >
          <Target size={18} /> Browse opportunities
        </Link>
        <Link
          href="/feed"
          className="px-4 py-2 bg-quantum-800 hover:bg-quantum-700 text-quantum-50 rounded-lg font-medium transition border border-quantum-700 flex items-center gap-2"
        >
          <Rss size={18} /> Feed
        </Link>
        <Link
          href="/saved"
          className="px-4 py-2 bg-quantum-800 hover:bg-quantum-700 text-quantum-50 rounded-lg font-medium transition border border-quantum-700"
        >
          Saved
        </Link>
        <Link
          href="/inbox"
          className="px-4 py-2 bg-quantum-800 hover:bg-quantum-700 text-quantum-50 rounded-lg font-medium transition border border-quantum-700"
        >
          Inbox
        </Link>
      </div>
    </div>
  );
}
