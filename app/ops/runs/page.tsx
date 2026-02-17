"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/Button";

type SourceRun = {
  id: string;
  source_id: string;
  agent_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  items_found: number;
  items_upserted: number;
  error_message: string | null;
  sources?: { name: string; parser_key: string } | null;
};

export default function OpsRunsPage() {
  const [runs, setRuns] = useState<SourceRun[]>([]);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [filterSource, setFilterSource] = useState<string>("");
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
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "operator") {
      router.push("/dashboard");
      return;
    }

    const { data: sourcesData } = await supabase
      .from("sources")
      .select("id, name")
      .order("name");
    setSources(sourcesData || []);

    let query = supabase
      .from("source_runs")
      .select("*, sources(name, parser_key)")
      .order("started_at", { ascending: false })
      .limit(100);

    if (filterSource) {
      query = query.eq("source_id", filterSource);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching runs:", error);
    } else {
      setRuns(data || []);
    }
    setLoading(false);
  }, [router, supabase, filterSource]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerRun = async (parserKey: string) => {
    try {
      const res = await fetch("/api/ops/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parser_key: parserKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.details || "Failed");
      fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to trigger run");
    }
  };

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading runs...</div>;

  const failures = runs.filter((r) => r.status === "failure");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/ops"
            className="text-quantum-400 hover:text-quantum-50 flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} /> Ops
          </Link>
          <h1 className="text-2xl font-bold text-quantum-50">Source Runs</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => fetchData()} className="flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </Button>
      </header>

      <div className="flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-quantum-400">Trigger:</label>
          {["gc_buyandsell", "canadabuys", "ab_surplus", "on_surplus", "city_toronto_surplus", "city_ottawa_surplus", "city_calgary_surplus", "city_edmonton_surplus"].map((key) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => triggerRun(key)}
              className="text-cyan-400 hover:text-cyan-300"
            >
              Run {key}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-quantum-400">Filter:</label>
          <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
        >
          <option value="">All</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        </div>
      </div>

      {failures.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-2">
            <AlertCircle size={16} /> Recent failures ({failures.length})
          </h2>
          <ul className="space-y-2 text-sm">
            {failures.slice(0, 5).map((r) => (
              <li key={r.id} className="flex flex-wrap gap-2 items-start">
                <span className="text-quantum-300">
                  {(r.sources as { name?: string })?.name ?? r.agent_name}
                </span>
                <span className="text-quantum-500 text-xs">
                  {new Date(r.started_at).toLocaleString()}
                </span>
                {r.error_message && (
                  <span className="text-red-400 text-xs block w-full mt-1">{r.error_message}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-quantum-900 border border-quantum-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-quantum-700 bg-quantum-800/50">
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Source</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Started</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Found</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Upserted</th>
              <th className="text-left px-4 py-3 text-quantum-300 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-quantum-800 last:border-0 hover:bg-quantum-800/30">
                <td className="px-4 py-3 text-quantum-100">
                  {(r.sources as { name?: string; parser_key?: string })?.name ?? r.agent_name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      r.status === "success"
                        ? "bg-accent-success/20 text-accent-success"
                        : r.status === "failure"
                        ? "bg-accent-danger/20 text-accent-danger"
                        : "bg-quantum-700 text-quantum-400"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-quantum-400">
                  {new Date(r.started_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-quantum-400">{r.items_found}</td>
                <td className="px-4 py-3 text-quantum-400">{r.items_upserted}</td>
                <td className="px-4 py-3 text-red-400 text-xs max-w-[200px] truncate" title={r.error_message ?? ""}>
                  {r.error_message ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 && (
          <div className="px-4 py-12 text-center text-quantum-500 text-sm">
            No runs yet. Trigger ingestion from Ops or wait for cron.
          </div>
        )}
      </div>
    </div>
  );
}
