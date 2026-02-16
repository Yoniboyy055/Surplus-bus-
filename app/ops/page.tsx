"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { Activity, Database, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function OpsPortal() {
  const [user, setUser] = useState<any>(null);
  const [ingestionRuns, setIngestionRuns] = useState<any[]>([]);
  const [sourceRuns, setSourceRuns] = useState<any[]>([]);
  const [agentHealth, setAgentHealth] = useState<any>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }
    setUser(user);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "operator") {
      router.push("/dashboard");
      return;
    }

    const { data: runs } = await supabase
      .from("ingestion_runs")
      .select("id, agent_name, source_url, status, items_found, items_queued, started_at, completed_at, error_message")
      .order("started_at", { ascending: false })
      .limit(20);
    setIngestionRuns(runs || []);

    const { data: sr, error: srErr } = await supabase
      .from("source_runs")
      .select("id, agent_name, status, items_found, items_upserted, started_at, completed_at")
      .order("started_at", { ascending: false })
      .limit(10);
    if (!srErr) setSourceRuns(sr || []);

    try {
      const res = await fetch("/api/agents/health");
      if (res.ok) {
        const data = await res.json();
        setAgentHealth(data.health);
      }
    } catch (e) {
      console.error("Failed to fetch agent health", e);
    }

    const { count } = await supabase
      .from("property_candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued");
    setQueueCount(count || 0);

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading Ops Portal...</div>;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-quantum-50">Ops Portal</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-bold uppercase tracking-wider">
              System Administrator
            </span>
            {agentHealth && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  agentHealth.status === "healthy"
                    ? "bg-accent-success/20 text-accent-success"
                    : "bg-accent-danger/20 text-accent-danger"
                }`}
              >
                <Activity size={10} /> Agents: {agentHealth.status} ({agentHealth.success_rate}%)
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/ops/properties/review"
            className="px-4 py-2 bg-quantum-800 hover:bg-quantum-700 text-quantum-50 rounded-lg text-sm font-medium flex items-center gap-2 transition border border-quantum-700"
          >
            <Database size={16} />
            Review Queue
            {queueCount > 0 && (
              <span className="bg-cyan-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {queueCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-quantum-200 mb-3 flex items-center gap-2">
            <BarChart3 size={16} /> Recent Source Runs
          </h2>
          {sourceRuns.length === 0 && ingestionRuns.length === 0 ? (
            <p className="text-quantum-500 text-sm">No runs yet. Agents will populate when cron triggers.</p>
          ) : (
            <ul className="space-y-2">
              {sourceRuns.slice(0, 10).map((run) => (
                <li
                  key={run.id}
                  className="flex items-center justify-between text-sm py-2 border-b border-quantum-800 last:border-0"
                >
                  <span className="text-quantum-300">{run.agent_name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      run.status === "success"
                        ? "bg-accent-success/20 text-accent-success"
                        : run.status === "failure"
                        ? "bg-accent-danger/20 text-accent-danger"
                        : "bg-quantum-700 text-quantum-400"
                    }`}
                  >
                    {run.status}
                  </span>
                  <span className="text-quantum-500 text-xs">
                    {run.items_found ?? 0} found, {run.items_upserted ?? 0} upserted
                  </span>
                </li>
              ))}
              {sourceRuns.length === 0 &&
                ingestionRuns.slice(0, 10).map((run) => (
                  <li
                    key={run.id}
                    className="flex items-center justify-between text-sm py-2 border-b border-quantum-800 last:border-0"
                  >
                    <span className="text-quantum-300">{run.agent_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        run.status === "success"
                          ? "bg-accent-success/20 text-accent-success"
                          : run.status === "failure"
                          ? "bg-accent-danger/20 text-accent-danger"
                          : "bg-quantum-700 text-quantum-400"
                      }`}
                    >
                      {run.status}
                    </span>
                    <span className="text-quantum-500 text-xs">
                      {run.items_found ?? 0} found, {run.items_queued ?? 0} queued
                    </span>
                  </li>
                ))}
            </ul>
          )}
          <Link href="/ops/runs" className="text-cyan-400 hover:text-cyan-300 text-xs mt-2 inline-block">
            View all runs →
          </Link>
        </div>

        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-quantum-200 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              href="/ops/sources"
              className="block px-4 py-2 bg-quantum-800 hover:bg-quantum-700 rounded-lg text-sm font-medium text-quantum-50 transition"
            >
              Manage Sources
            </Link>
            <Link
              href="/ops/runs"
              className="block px-4 py-2 bg-quantum-800 hover:bg-quantum-700 rounded-lg text-sm font-medium text-quantum-50 transition"
            >
              Source Runs
            </Link>
            <Link
              href="/ops/properties/review"
              className="block px-4 py-2 bg-quantum-800 hover:bg-quantum-700 rounded-lg text-sm font-medium text-quantum-50 transition"
            >
              Review Property Candidates
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
