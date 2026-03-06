"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Target } from "lucide-react";

type Opportunity = {
  id: string;
  title: string;
  province: string;
  category: string | null;
  source: string;
  estimated_value: number | null;
  closing_date: string | null;
  status: string;
};

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];
const CATEGORIES = ["Equipment", "Vehicles", "Surplus", "Procurement", "Other"];

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "open" || s === "active") return "bg-cyan-500/15 text-cyan-300 border-cyan-500/40";
  if (s === "closed" || s === "expired") return "bg-red-500/15 text-red-300 border-red-500/40";
  return "bg-quantum-800 text-quantum-400 border-quantum-700";
}

export function OpportunitiesClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [province, setProvince] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (province) params.set("province", province);
      if (category) params.set("category", category);
      if (qDebounced.trim()) params.set("q", qDebounced.trim());
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/opportunities?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setOpportunities(json.opportunities || []);
      setTotal(json.total ?? 0);
      setTotalPages(json.totalPages ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [supabase, router, province, category, qDebounced, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) return <div className="text-center py-20 text-accent-danger">{error}</div>;

  const openCount = opportunities.filter((o) => {
    const s = o.status?.toLowerCase();
    return s === "open" || s === "active";
  }).length;

  const estimatedTotal = opportunities.reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-quantum-50">Opportunities</h1>
        <p className="text-quantum-400 mt-1">Surplus and RFP opportunities from government sources.</p>
      </div>

      {/* Stats bar */}
      <div className="grid gap-4 grid-cols-3">
        <div className="rounded-lg p-4 border bg-quantum-900 border-quantum-700 hover:border-quantum-500 transition">
          <p className="text-xs text-quantum-500 uppercase tracking-wide">Total</p>
          <p className="mt-1 text-2xl font-semibold text-quantum-50">{loading ? "—" : total}</p>
        </div>
        <div className="rounded-lg p-4 border bg-cyan-950/30 border-cyan-500/40 hover:border-cyan-400 transition">
          <p className="text-xs text-quantum-500 uppercase tracking-wide">Open (this page)</p>
          <p className="mt-1 text-2xl font-semibold text-quantum-50">{loading ? "—" : openCount}</p>
        </div>
        <div className="rounded-lg p-4 border bg-quantum-900 border-quantum-700 hover:border-quantum-500 transition">
          <p className="text-xs text-quantum-500 uppercase tracking-wide">Est. pipeline (page)</p>
          <p className="mt-1 text-2xl font-semibold text-quantum-50">{loading ? "—" : estimatedTotal > 0 ? currency.format(estimatedTotal) : "—"}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-xs text-quantum-500 block mb-1 uppercase tracking-wide">Province</label>
          <select
            value={province}
            onChange={(e) => { setProvince(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm hover:border-quantum-500 transition"
          >
            <option value="">All</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-quantum-500 block mb-1 uppercase tracking-wide">Category</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm hover:border-quantum-500 transition"
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-quantum-500 block mb-1 uppercase tracking-wide">Search</label>
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search title or description..."
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm hover:border-quantum-500 focus:border-cyan-500/60 focus:outline-none transition"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-quantum-800/70 animate-pulse" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No opportunities match your filters"
          description="Adjust filters or wait for new data to be ingested."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {opportunities.map((opp) => (
              <li
                key={opp.id}
                className="group bg-quantum-900 border border-quantum-700 rounded-xl p-5 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {opp.category && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-quantum-800 text-quantum-300 border-quantum-700 uppercase tracking-wider">
                          {opp.category}
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-quantum-800 text-quantum-400 border-quantum-700 uppercase tracking-wider">
                        {opp.province}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${statusBadgeClass(opp.status)}`}>
                        {opp.status}
                      </span>
                    </div>
                    <Link
                      href={`/opportunities/${opp.id}`}
                      className="text-quantum-100 hover:text-cyan-300 font-medium text-sm leading-snug block transition-colors"
                    >
                      {opp.title}
                    </Link>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-quantum-500">
                      <span>{opp.source}</span>
                      {opp.estimated_value != null && (
                        <span className="text-quantum-300 font-medium">{currency.format(opp.estimated_value)}</span>
                      )}
                      {opp.closing_date && (
                        <span>Closes {new Date(opp.closing_date).toLocaleDateString("en-CA")}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/opportunities/${opp.id}`}
                    className="shrink-0 text-xs font-medium text-quantum-500 group-hover:text-cyan-400 transition-colors"
                  >
                    View →
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 bg-quantum-800 border border-quantum-700 hover:border-quantum-500 disabled:opacity-50 rounded-lg text-sm transition"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-quantum-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 bg-quantum-800 border border-quantum-700 hover:border-quantum-500 disabled:opacity-50 rounded-lg text-sm transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}


