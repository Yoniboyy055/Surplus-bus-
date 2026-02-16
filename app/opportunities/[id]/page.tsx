import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SaveOpportunityButton } from "./SaveOpportunityButton";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  const { data: opp, error } = await supabase
    .from("opportunities")
    .select("*, opportunity_features(*)")
    .eq("id", id)
    .single();

  if (error || !opp) notFound();

  const { data: history } = await supabase
    .from("opportunity_history")
    .select("scraped_at, status, value_snapshot")
    .eq("opportunity_id", id)
    .order("scraped_at", { ascending: false })
    .limit(10);

  const { data: saved } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id")
    .eq("profile_id", data.user.id)
    .eq("opportunity_id", id)
    .maybeSingle();

  const features = Array.isArray(opp.opportunity_features) ? opp.opportunity_features[0] : opp.opportunity_features;

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
        <SaveOpportunityButton
          opportunityId={id}
          isSaved={!!saved}
          userId={data.user.id}
        />
      </div>

      <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-quantum-200 mb-3">Details</h2>
        <dl className="grid gap-3 text-sm">
          {opp.estimated_value != null && (
            <div>
              <dt className="text-quantum-500">Estimated value</dt>
              <dd className="text-quantum-50">
                ${opp.estimated_value.toLocaleString()}
              </dd>
            </div>
          )}
          {opp.closing_date && (
            <div>
              <dt className="text-quantum-500">Closing date</dt>
              <dd className="text-quantum-50">
                {new Date(opp.closing_date).toLocaleDateString()}
              </dd>
            </div>
          )}
          {opp.issuing_entity && (
            <div>
              <dt className="text-quantum-500">Issuing entity</dt>
              <dd className="text-quantum-50">{opp.issuing_entity}</dd>
            </div>
          )}
          {opp.buyer_agency && (
            <div>
              <dt className="text-quantum-500">Issuing entity</dt>
              <dd className="text-quantum-50">{opp.buyer_agency}</dd>
            </div>
          )}
          <div>
            <dt className="text-quantum-500">Status</dt>
            <dd className="text-quantum-50">{opp.status}</dd>
          </div>
        </dl>
        {opp.source_url && (
          <a
            href={opp.source_url}
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

      {features && (
        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-quantum-200 mb-3">Scores</h2>
          <div className="grid gap-2 text-sm">
            <span>Normalized: {features.normalized_score}</span>
            <span>Demand: {features.demand_score}</span>
            <span>Value: {features.value_score}</span>
            <span>Urgency: {features.urgency_score}</span>
          </div>
        </div>
      )}

      {history && history.length > 0 && (
        <div className="bg-quantum-900 border border-quantum-700 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-quantum-200 mb-3">History</h2>
          <ul className="space-y-2">
            {history.map((h: any, i: number) => (
              <li key={i} className="text-sm text-quantum-400">
                {new Date(h.scraped_at).toLocaleString()} — {h.status || "—"}
                {h.value_snapshot != null && ` ($${h.value_snapshot.toLocaleString()})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
