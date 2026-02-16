"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Target } from "lucide-react";

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      try {
        const res = await fetch("/api/opportunities/ranked?limit=50");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch");
        }
        const json = await res.json();
        setOpportunities(json.opportunities || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load opportunities");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, supabase]);

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading opportunities...</div>;
  if (error) return <div className="text-center py-20 text-accent-danger">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">Opportunities</h1>
      <p className="text-quantum-400">Ranked surplus and RFP opportunities based on your preferences.</p>

      {opportunities.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No opportunities match your filters"
          description="Adjust your preferences in settings or wait for new data to be ingested."
        />
      ) : (
        <ul className="space-y-4">
          {opportunities.map((opp: any) => (
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
                    {opp.estimated_value != null && (
                      <span>${opp.estimated_value.toLocaleString()}</span>
                    )}
                    {opp.closing_date && (
                      <span>Closes {new Date(opp.closing_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  {opp.score != null && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                      Score: {Math.round(opp.score)}
                    </span>
                  )}
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
      )}
    </div>
  );
}
