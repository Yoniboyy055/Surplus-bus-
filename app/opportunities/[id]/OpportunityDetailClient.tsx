"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SaveOpportunityButton } from "./SaveOpportunityButton";
import { normalizeExternalUrl } from "@/lib/url";

type Opportunity = {
  id: string;
  title: string;
  province: string;
  category: string | null;
  source: string;
  source_url: string | null;
  description: string | null;
  estimated_value: number | null;
  closing_date: string | null;
  issuing_entity: string | null;
  status: string;
};

type Event = {
  id: string;
  event_type: string;
  detected_at: string;
  diff: unknown;
};

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

export function OpportunityDetailClient() {
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      if (!supabase || !id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      setUserId(user.id);

      const { data: savedRow } = await supabase
        .from("saved_opportunities")
        .select("opportunity_id")
        .eq("profile_id", user.id)
        .eq("opportunity_id", id)
        .maybeSingle();
      setSaved(!!savedRow);

      try {
        const res = await fetch(`/api/opportunities/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Opportunity not found");
            return;
          }
          throw new Error("Failed to load");
        }
        const json = await res.json();
        setOpp(json.opportunity);
        setEvents(json.events || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase, router, id]);

  if (loading) return <div className="text-center py-20 text-quantum-500">Loading...</div>;
  if (error || !opp) return <div className="text-center py-20 text-accent-danger">{error || "Not found"}</div>;

  const sourceHref = normalizeExternalUrl(opp.source_url);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back nav */}
      <Link href="/opportunities" className="text-quantum-500 hover:text-quantum-300 text-sm inline-flex items-center gap-1 transition-colors">
        ← Back to opportunities
      </Link>

      {/* Full-width header panel */}
      <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-quantum-800 text-quantum-400 border-quantum-700 uppercase tracking-wider">
                {opp.province}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${statusBadgeClass(opp.status)}`}>
                {opp.status}
              </span>
              {opp.category && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-quantum-800 text-quantum-300 border-quantum-700 uppercase tracking-wider">
                  {opp.category}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-quantum-50 leading-snug">{opp.title}</h1>
            {opp.issuing_entity && (
              <p className="text-quantum-400 text-sm mt-1">{opp.issuing_entity}</p>
            )}
          </div>
          {userId && (
            <SaveOpportunityButton
              opportunityId={opp.id}
              isSaved={saved}
              userId={userId}
            />
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6 shadow-lg shadow-black/20">
        <h2 className="text-xs font-semibold text-quantum-500 uppercase tracking-wider mb-4">Details</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-quantum-500 text-xs uppercase tracking-wide mb-1">Source</dt>
            <dd className="text-quantum-100 font-medium">{opp.source}</dd>
          </div>
          {opp.category && (
            <div>
              <dt className="text-quantum-500 text-xs uppercase tracking-wide mb-1">Category</dt>
              <dd className="text-quantum-100 font-medium">{opp.category}</dd>
            </div>
          )}
          {opp.estimated_value != null && (
            <div>
              <dt className="text-quantum-500 text-xs uppercase tracking-wide mb-1">Est. value</dt>
              <dd className="text-quantum-100 font-medium">{currency.format(opp.estimated_value)}</dd>
            </div>
          )}
          {opp.closing_date && (
            <div>
              <dt className="text-quantum-500 text-xs uppercase tracking-wide mb-1">Closing date</dt>
              <dd className="text-quantum-100 font-medium">{new Date(opp.closing_date).toLocaleDateString("en-CA")}</dd>
            </div>
          )}
        </dl>

        {sourceHref ? (
          <a
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition text-white text-sm font-medium"
          >
            View Source ↗
          </a>
        ) : opp.source_url ? (
          <span className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-quantum-800 border border-quantum-700 text-quantum-500 text-sm cursor-not-allowed">
            Source unavailable
          </span>
        ) : null}
      </div>

      {/* Description */}
      {opp.description && (
        <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6 shadow-lg shadow-black/20">
          <h2 className="text-xs font-semibold text-quantum-500 uppercase tracking-wider mb-3">Description</h2>
          <p className="text-quantum-300 whitespace-pre-wrap text-sm leading-relaxed">{opp.description}</p>
        </div>
      )}

      {/* Activity timeline */}
      {events.length > 0 && (
        <div className="bg-quantum-900 border border-quantum-700 rounded-xl p-6 shadow-lg shadow-black/20">
          <h2 className="text-xs font-semibold text-quantum-500 uppercase tracking-wider mb-3">Activity</h2>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="text-sm text-quantum-400 flex items-center gap-2">
                <span className="text-quantum-600 shrink-0">{new Date(e.detected_at).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}</span>
                <span className="text-quantum-700">—</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-quantum-800 text-quantum-300 border-quantum-700 uppercase tracking-wider">
                  {e.event_type.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
