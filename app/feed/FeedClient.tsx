"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { Rss } from "lucide-react";

type FeedEvent = {
  id: string;
  event_type: string;
  detected_at: string;
  diff: unknown;
  opportunities: { id: string; title: string; province: string; category: string | null; source: string } | null;
};

export function FeedClient() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

      try {
        const res = await fetch("/api/feed");
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        setEvents(json.events || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load feed");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, supabase]);

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading feed...</div>;
  if (error) return <div className="text-center py-20 text-accent-danger">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">Feed</h1>
      <p className="text-quantum-400">Activity timeline for opportunities.</p>

      {events.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="No new activity yet"
          description="Opportunity events will appear here as agents discover and update listings."
        />
      ) : (
        <ul className="space-y-4">
          {events.map((item) => (
            <li
              key={item.id}
              className="bg-quantum-900 border border-quantum-700 rounded-lg p-4 hover:border-quantum-600 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-quantum-500 text-xs uppercase tracking-wider mr-2">
                    {item.event_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-quantum-500 text-xs">
                    {new Date(item.detected_at).toLocaleString()}
                  </span>
                  {item.opportunities && (
                    <div className="mt-2">
                      <Link
                        href={`/opportunities/${item.opportunities.id}`}
                        className="text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        {item.opportunities.title}
                      </Link>
                      <p className="text-quantum-500 text-sm mt-1">
                        {item.opportunities.province} · {item.opportunities.category || "—"}
                      </p>
                    </div>
                  )}
                </div>
                {item.opportunities && (
                  <Link
                    href={`/opportunities/${item.opportunities.id}`}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    View →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
