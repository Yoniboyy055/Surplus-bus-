/**
 * Computes opportunity_intelligence using ranking v2 (YkRO).
 * Closed / past-closing listings get score 0 and urgency expired.
 */
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { scoreOpportunityV2 } from "./scoring";

export type OpportunityForIntelligence = {
  id: string;
  estimated_value: number | null;
  closing_date: string | null;
  category?: string | null;
  province?: string | null;
  source_url?: string | null;
  first_seen_at?: string | null;
  status?: string | null;
};

export async function computeOpportunityIntelligence(
  opportunityId: string,
  opp?: OpportunityForIntelligence | null
): Promise<void> {
  const supabase = createServiceRoleClient();

  let data = opp;
  if (!data) {
    const { data: row, error } = await supabase
      .from("opportunities")
      .select("id, estimated_value, closing_date, category, province, source_url, first_seen_at, status")
      .eq("id", opportunityId)
      .single();
    if (error || !row) return;
    data = row;
  }

  const result = scoreOpportunityV2({
    id: data.id,
    estimated_value: data.estimated_value,
    closing_date: data.closing_date,
    category: data.category ?? null,
    province: data.province ?? null,
    source_url: data.source_url ?? null,
    first_seen_at: data.first_seen_at ?? null,
    status: data.status ?? null,
  });

  const days =
    data.closing_date == null
      ? null
      : Math.ceil((new Date(data.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  let urgency = "unknown";
  if (result.excluded) urgency = "expired";
  else if (days === null) urgency = "unknown";
  else if (days <= 7) urgency = "high";
  else if (days <= 30) urgency = "medium";
  else urgency = "low";

  const bucket =
    data.estimated_value == null || data.estimated_value <= 0
      ? "unknown"
      : data.estimated_value < 10000
        ? "low"
        : data.estimated_value < 100000
          ? "mid"
          : "high";

  await supabase.from("opportunity_intelligence").upsert(
    {
      opportunity_id: opportunityId,
      score: result.score,
      score_version: 2,
      estimated_value_bucket: bucket,
      urgency_level: urgency,
      days_to_close: days,
      last_computed_at: new Date().toISOString(),
    },
    { onConflict: "opportunity_id" }
  );
}
