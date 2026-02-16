import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/auth/ensureProfile";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/ownerEmail";
import Link from "next/link";

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    redirect("/auth?error=supabase_not_configured");
  }

  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  if (isOwnerEmail(data.user.email)) {
    try {
      await ensureProfile(supabase, data.user);
    } catch (e) {
      console.error("Owner profile sync failed", e);
    }
    redirect("/ops");
  }

  try {
    const { profile } = await ensureProfile(supabase, data.user);

    if (profile.role === "operator") {
      redirect("/ops");
    }

    const { count: alertCount } = await supabase
      .from("alert_rules")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", data.user.id)
      .eq("is_active", true);

    const { data: recentRuns } = await supabase
      .from("ingestion_runs")
      .select("id, status, completed_at")
      .order("started_at", { ascending: false })
      .limit(5);

    const hasAlerts = (alertCount ?? 0) > 0;
    const lastRun = recentRuns?.[0];
    const isFresh = lastRun?.completed_at
      ? new Date(lastRun.completed_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
      : false;

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-quantum-50">Dashboard</h1>
          <p className="text-quantum-400 mt-1">Your intelligence hub for surplus and RFP opportunities.</p>
        </div>

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
            <Link
              href="/alerts"
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
            >
              {hasAlerts ? "Manage alerts" : "Create your first alert"} →
            </Link>
          </div>

          <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
            <h2 className="text-sm font-semibold text-quantum-200 mb-2">Data freshness</h2>
            {lastRun ? (
              <p className="text-quantum-400 text-sm">
                Last ingestion: {lastRun.status}{" "}
                {isFresh ? (
                  <span className="text-accent-success">(recent)</span>
                ) : (
                  <span className="text-quantum-500">(older)</span>
                )}
              </p>
            ) : (
              <p className="text-quantum-500 text-sm">No ingestion runs yet.</p>
            )}
            <Link href="/feed" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium mt-2 inline-block">
              View feed →
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/opportunities"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition"
          >
            Browse opportunities
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
  } catch (error) {
    console.error("Profile lookup failed", error);
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.message.includes("NEXT_REDIRECT"))) {
      throw error;
    }
    redirect("/auth?error=profile_init_failed");
  }
}
