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

const EVENT_LABEL: Record<string, string> = {
  new_listing: "New listing",
  updated: "Updated",
  closed: "Closed",
  price_change: "Price change",
};

function eventLabel(type: string) {
  return EVENT_LABEL[type] ?? type.replace(/_/g, " ");
}

function eventBadgeClass(type: string) {
  if (type === "new_listing") return "bg-cyan-500/15 text-cyan-300 border-cyan-500/40";
  if (type === "closed") return "bg-red-500/15 text-red-300 border-red-500/40";
  if (type === "updated") return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  return "bg-quantum-800 text-quantum-400 border-quantum-700";
}

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

  const totalEvents = events.length;
  const newListings = events.filter((e) => e.event_type === "new_listing").length;
  const uniqueOpps = new Set(events.map((e) => e.opportunities?.id).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-quantum-50">Activity Feed</h1>
        <p className="text-quantum-400 mt-1">Real-time signal from all monitored sources.</p>
      </div>

      {/* Stats bar */}
      <div className="grid gap-4 grid-cols-3">
        <div className="rounded-lg p-4 border bg-quantum-900 border-quantum-700 hover:border-quantum-500 transition">
          <p className="text-xs text-quantum-500 uppercase tracking-wide">Total events</p>
          <p className="mt-1 text-2xl font-semibold text-quantum-50">{totalEvents}</p>
        </div>
        <div className="rounded-lg p-4 border bg-quantum-900 border-quantum-700 hover:border-quantum-500 transition">
          <p className="text-xs text-quantum-500 uppercase tracking-wide">New listings</p>
          <p className="mt-1 text-2xl font-semibold text-quantum-50">{newListings}</p>
        </div>
        <div className="rounded-lg p-4 border bg-quantum-900 border-quantum-700 hover:border-quantum-500 transition">
          <p className="text-xs text-quantum-500 uppercase tracking-wide">Opportunities</p>
          <p className="mt-1 text-2xl font-semibold text-quantum-50">{uniqueOpps}</p>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="No new activity yet"
          description="Opportunity events will appear here as agents discover and update listings."
        />
      ) : (
        <ul className="space-y-3">
          {events.map((item) => (
            <li
              key={item.id}
              className="group bg-quantum-900 border border-quantum-700 rounded-xl p-5 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${eventBadgeClass(item.event_type)}`}>
                      {eventLabel(item.event_type)}
                    </span>
                    {item.opportunities?.province && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-quantum-800 text-quantum-400 border-quantum-700 uppercase tracking-wider">
                        {item.opportunities.province}
                      </span>
                    )}
                    <span className="text-quantum-600 text-xs ml-auto">
                      {new Date(item.detected_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>

                  {item.opportunities ? (
                    <>
                      <Link
                        href={`/opportunities/${item.opportunities.id}`}
                        className="text-quantum-100 hover:text-cyan-300 font-medium text-sm leading-snug block truncate transition-colors"
                      >
                        {item.opportunities.title}
                      </Link>
                      <p className="text-quantum-500 text-xs mt-1.5 flex items-center gap-2">
                        {item.opportunities.category && (
                          <span className="uppercase tracking-wider text-quantum-400">{item.opportunities.category}</span>
                        )}
                        {item.opportunities.category && <span className="text-quantum-700">·</span>}
                        <span>{item.opportunities.source}</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-quantum-500 text-sm italic">No linked opportunity</p>
                  )}
                </div>

                {item.opportunities && (
                  <Link
                    href={`/opportunities/${item.opportunities.id}`}
                    className="shrink-0 text-xs font-medium text-quantum-500 group-hover:text-cyan-400 transition-colors"
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
