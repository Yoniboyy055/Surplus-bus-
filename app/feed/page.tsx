import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Rss } from "lucide-react";

export default async function FeedPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  const { data: events, error: eventsError } = await supabase
    .from("opportunity_events")
    .select(`
      id, event_type, detected_at, diff,
      opportunities(id, title, province, category, source)
    `)
    .order("detected_at", { ascending: false })
    .limit(50);

  const { data: historyFallback } = eventsError || !events || events.length === 0
    ? await supabase
        .from("opportunity_history")
        .select(`
          id, scraped_at, status,
          opportunities(id, title, province, category, source)
        `)
        .order("scraped_at", { ascending: false })
        .limit(50)
    : { data: null };

  const items = !eventsError && events && events.length > 0
    ? events
    : (historyFallback || []).map((h: any) => ({
        id: h.id,
        event_type: "updated",
        detected_at: h.scraped_at,
        diff: null,
        opportunities: h.opportunities,
      }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">Feed</h1>
      <p className="text-quantum-400">Activity timeline for opportunities.</p>

      {items.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="No new activity yet"
          description="Opportunity events will appear here as agents discover and update listings."
        />
      ) : (
        <ul className="space-y-4">
          {items.map((item: any) => (
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
