"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SaveOpportunityButton } from "./SaveOpportunityButton";
import { isExternalHttpUrl } from "@/lib/url";

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

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/opportunities" className="text-quantum-500 hover:text-quantum-400 text-sm mb-2 inline-block">
            ← Back to opportunities
          </Link>
          <h1 className="text-2xl font-bold text-quantum-50">{opp.title}</h1>
          <div className="flex gap-4 mt-2 text-sm text-quantum-500">
            <span>{opp.province}</span>
            <span>{opp.category || "—"}</span>
            <span>{opp.source}</span>
          </div>
        </div>
        {userId && (
          <SaveOpportunityButton
            opportunityId={opp.id}
            isSaved={saved}
            userId={userId}
          />
        )}
      </div>

      <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-quantum-200 mb-3">Details</h2>
        <dl className="grid gap-3 text-sm">
          {opp.estimated_value != null && (
            <div>
              <dt className="text-quantum-500">Estimated value</dt>
              <dd className="text-quantum-50">${opp.estimated_value.toLocaleString()}</dd>
            </div>
          )}
          {opp.closing_date && (
            <div>
              <dt className="text-quantum-500">Closing date</dt>
              <dd className="text-quantum-50">{new Date(opp.closing_date).toLocaleDateString()}</dd>
            </div>
          )}
          {opp.issuing_entity && (
            <div>
              <dt className="text-quantum-500">Issuing entity</dt>
              <dd className="text-quantum-50">{opp.issuing_entity}</dd>
            </div>
          )}
          <div>
            <dt className="text-quantum-500">Status</dt>
            <dd className="text-quantum-50">{opp.status}</dd>
          </div>
        </dl>
        {isExternalHttpUrl(opp.source_url) && (
          <a
            href={opp.source_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-cyan-400 hover:text-cyan-300 text-sm"
          >
            View source →
          </a>
        )}
      </div>

      {opp.description && (
        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-quantum-200 mb-3">Description</h2>
          <p className="text-quantum-400 whitespace-pre-wrap">{opp.description}</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-quantum-200 mb-3">Activity</h2>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="text-sm text-quantum-400">
                {new Date(e.detected_at).toLocaleString()} — {e.event_type.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
