/**
 * Computes and upserts opportunity_intelligence for an opportunity.
 * Deterministic scoring: days_to_close, urgency_level, value_bucket, score.
 */
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export type OpportunityForIntelligence = {
  id: string;
  estimated_value: number | null;
  closing_date: string | null;
};

function daysToClose(closingDate: string | null): number | null {
  if (!closingDate) return null;
  const now = new Date();
  const target = new Date(closingDate);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function urgencyLevel(days: number | null): string {
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 7) return "high";
  if (days <= 30) return "medium";
  return "low";
}

function valueBucket(value: number | null): string {
  if (value === null || value <= 0) return "unknown";
  if (value < 10000) return "low";
  if (value < 100000) return "mid";
  return "high";
}

function computeScore(days: number | null, value: number | null): number {
  const urgencyWeight = days === null ? 0.5 : days <= 7 ? 1.2 : days <= 30 ? 1.0 : 0.8;
  const valueWeight = value === null || value <= 0 ? 0.5 : Math.min(1.5, Math.log10(value + 1) / 6);
  return Math.round(100 * (0.6 * urgencyWeight + 0.4 * valueWeight));
}

export async function computeOpportunityIntelligence(
  opportunityId: string,
  opp?: OpportunityForIntelligence | null
): Promise<void> {
  const supabase = createServiceRoleClient();

  let data = opp;
  if (!data) {
    const { data: row, error } = await supabase
      .from("opportunities")
      .select("id, estimated_value, closing_date")
      .eq("id", opportunityId)
      .single();
    if (error || !row) return;
    data = row;
  }

  const days = daysToClose(data.closing_date);
  const urgency = urgencyLevel(days);
  const bucket = valueBucket(data.estimated_value);
  const score = computeScore(days, data.estimated_value);

  await supabase.from("opportunity_intelligence").upsert(
    {
      opportunity_id: opportunityId,
      score,
      score_version: 1,
      estimated_value_bucket: bucket,
      urgency_level: urgency,
      days_to_close: days,
      last_computed_at: new Date().toISOString(),
    },
    { onConflict: "opportunity_id" }
  );
}
