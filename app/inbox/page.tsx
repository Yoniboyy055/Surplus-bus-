"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data } = await supabase
        .from("alert_matches")
        .select(`
          id, matched_at,
          alert_rules(category),
          opportunities(id, title, province, category, estimated_value, closing_date, source)
        `)
        .order("matched_at", { ascending: false })
        .limit(50);

      setMatches(data || []);
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading inbox...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">Inbox</h1>
      <p className="text-quantum-400">Alerts that matched opportunities.</p>

      {matches.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Alerts will appear here when they match"
          description="Create alerts and when new opportunities match your criteria, they will show up here."
          actionLabel="Create alert"
          onAction={() => router.push("/alerts")}
        />
      ) : (
        <ul className="space-y-4">
          {matches.map((m: any) => {
            const opp = m.opportunities;
            const rule = m.alert_rules;
            if (!opp) return null;
            return (
              <li
                key={m.id}
                className="bg-quantum-900 border border-quantum-700 rounded-lg p-4 hover:border-quantum-600 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    {rule && (
                      <span className="text-xs text-quantum-500 uppercase tracking-wider">
                        Matched: {rule.category}
                      </span>
                    )}
                    <Link
                      href={`/opportunities/${opp.id}`}
                      className="block text-cyan-400 hover:text-cyan-300 font-medium mt-1"
                    >
                      {opp.title}
                    </Link>
                    <div className="flex gap-4 mt-2 text-sm text-quantum-500">
                      <span>{opp.province}</span>
                      <span>{opp.category || "—"}</span>
                      {opp.estimated_value != null && (
                        <span>${opp.estimated_value.toLocaleString()}</span>
                      )}
                    </div>
                    <p className="text-xs text-quantum-600 mt-1">
                      {new Date(m.matched_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/opportunities/${opp.id}`}
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                  >
                    View →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
