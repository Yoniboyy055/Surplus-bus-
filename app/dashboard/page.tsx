
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Fetch profile
  let profile = null;
  try {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = data || null;
  } catch {}

  // Parallel metric queries
  let [alertsRes, matchesRes, oppsRes, savedRes, runsRes] = await Promise.all([
    supabase.from("alert_rules").select("id", { count: "exact" }).eq("profile_id", user.id).eq("is_active", true),
    supabase.from("alert_matches").select("id", { count: "exact" }).eq("profile_id", user.id).gte("matched_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("opportunities").select("id", { count: "exact" }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("saved_opportunities").select("id", { count: "exact" }).eq("profile_id", user.id),
    supabase.from("ingestion_runs").select("agent_name,status,items_found,completed_at").order("completed_at", { ascending: false }).limit(6),
  ]);

  const alertCount = alertsRes?.count ?? 0;
  const matchCount = matchesRes?.count ?? 0;
  const oppCount = oppsRes?.count ?? 0;
  const savedCount = savedRes?.count ?? 0;
  const runs = runsRes?.data ?? [];

  // Greeting
  const firstName = user.email?.split("@")[0]?.split(".")[0]?.replace(/[^a-zA-Z]/g, "");
  const today = new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });

  // Data status pill
  let dataStatus = "DATA STALE";
  let pillColor = "bg-amber-600";
  if (runs.length > 0 && runs[0].completed_at) {
    const diffMs = new Date().getTime() - new Date(runs[0].completed_at).getTime();
    const hoursAgo = Math.floor(diffMs / 3600000);
    if (hoursAgo <= 2) {
      dataStatus = "DATA FRESH";
      pillColor = "bg-cyan-600";
    }
  }

  return (
    <AppShell user={user} profile={profile}>
      <div className="space-y-8">
        {/* Greeting */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-quantum-50">Good morning, {firstName}</h1>
          <span className="text-quantum-400">{today}</span>
          <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${pillColor}`}>{dataStatus}</span>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-quantum-900 rounded-xl p-4 text-center">
            <div className="text-lg font-bold text-quantum-50">{alertCount}</div>
            <div className="text-xs text-quantum-400 mt-1">Active Alerts</div>
          </div>
          <div className="bg-quantum-900 rounded-xl p-4 text-center">
            <div className="text-lg font-bold text-quantum-50">{matchCount}</div>
            <div className="text-xs text-quantum-400 mt-1">Inbox Matches this week</div>
          </div>
          <div className="bg-quantum-900 rounded-xl p-4 text-center">
            <div className="text-lg font-bold text-quantum-50">{oppCount}</div>
            <div className="text-xs text-quantum-400 mt-1">New Opportunities this week</div>
          </div>
          <div className="bg-quantum-900 rounded-xl p-4 text-center">
            <div className="text-lg font-bold text-quantum-50">{savedCount}</div>
            <div className="text-xs text-quantum-400 mt-1">Saved</div>
          </div>
        </div>

        {/* Two-column section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent activity */}
          <div className="bg-quantum-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-quantum-50 mb-2">Recent activity</h2>
            {matchCount > 0 || oppCount > 0 ? (
              <div className="space-y-2">
                {matchCount > 0 && (
                  <div>
                    <span className="font-medium">{matchCount} alert matches this week</span>
                    <Link href="/inbox" className="ml-2 text-cyan-400 underline">View inbox</Link>
                  </div>
                )}
                {oppCount > 0 && (
                  <div>
                    <span className="font-medium">{oppCount} new opportunities indexed</span>
                    <Link href="/opportunities" className="ml-2 text-cyan-400 underline">Browse</Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-quantum-400">
                No activity yet. Set up alerts to start receiving matches.
                <Link href="/alerts" className="ml-2 text-cyan-400 underline">Set up alerts</Link>
              </div>
            )}
          </div>

          {/* Data ingestion */}
          <div className="bg-quantum-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-quantum-50 mb-2">Data ingestion</h2>
            {runs.length > 0 ? (
              <ul className="space-y-2">
                {runs.map((run, idx) => {
                  let dotColor = "bg-amber-500";
                  if (run.status === "success") dotColor = "bg-green-500";
                  else if (run.status === "failure") dotColor = "bg-red-500";
                  return (
                    <li key={idx} className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                      <span className="font-medium">{run.agent_name}</span>
                      <span className="text-xs text-quantum-400">{run.items_found} items</span>
                      <span className="text-xs text-quantum-400">{formatDate(run.completed_at)} ({formatRelativeTime(run.completed_at)})</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-quantum-400">No ingestion runs yet.</div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-4 mt-6">
          <Link href="/opportunities" className="bg-cyan-600 text-white px-4 py-2 rounded font-semibold">Browse opportunities</Link>
          <Link href="/alerts" className="border border-cyan-600 text-cyan-600 px-4 py-2 rounded font-semibold">Manage alerts</Link>
          <Link href="/feed" className="border border-cyan-600 text-cyan-600 px-4 py-2 rounded font-semibold">View feed</Link>
          <Link href="/inbox" className="border border-cyan-600 text-cyan-600 px-4 py-2 rounded font-semibold">Inbox</Link>
        </div>
      </div>
    </AppShell>
  );
}
