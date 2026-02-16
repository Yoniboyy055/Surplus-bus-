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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">Opportunities</h1>
      <p className="text-quantum-400">Surplus and RFP opportunities from government sources.</p>

      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-xs text-quantum-500 block mb-1">Province</label>
          <select
            value={province}
            onChange={(e) => { setProvince(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
          >
            <option value="">All</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-quantum-500 block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-quantum-500 block mb-1">Search</label>
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search title or description..."
            className="w-full px-3 py-2 bg-quantum-800 border border-quantum-700 rounded text-quantum-100 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-quantum-500">Loading...</div>
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No opportunities match your filters"
          description="Adjust filters or wait for new data to be ingested."
        />
      ) : (
        <>
          <ul className="space-y-4">
            {opportunities.map((opp) => (
              <li
                key={opp.id}
                className="bg-quantum-900 border border-quantum-700 rounded-lg p-4 hover:border-quantum-600 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <Link
                      href={`/opportunities/${opp.id}`}
                      className="text-cyan-400 hover:text-cyan-300 font-medium text-lg"
                    >
                      {opp.title}
                    </Link>
                    <div className="flex gap-4 mt-2 text-sm text-quantum-500">
                      <span>{opp.province}</span>
                      <span>{opp.category || "—"}</span>
                      <span>{opp.source}</span>
                      {opp.estimated_value != null && (
                        <span>${opp.estimated_value.toLocaleString()}</span>
                      )}
                      {opp.closing_date && (
                        <span>Closes {new Date(opp.closing_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/opportunities/${opp.id}`}
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
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
                className="px-4 py-2 bg-quantum-800 disabled:opacity-50 rounded text-sm"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-quantum-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 bg-quantum-800 disabled:opacity-50 rounded text-sm"
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
