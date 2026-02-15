import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth/requireUser";
import { computeScore, demandScore, normalizeScore, urgencyScore, valueScore } from "@/lib/intelligence/scoring";

export async function POST() {
  const { supabase, error } = await requireOperator();
  if (error || !supabase) return error!;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: opportunities, error: oppError } = await supabase
    .from("opportunities")
    .select("id,category,estimated_value,closing_date,created_at")
    .gte("created_at", ninetyDaysAgo)
    .neq("status", "closed");

  if (oppError) return NextResponse.json({ error: oppError.message }, { status: 400 });

  if (!opportunities?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const categoryCount = new Map<string, number>();
  const categoryValueTotals = new Map<string, { sum: number; count: number }>();

  for (const row of opportunities) {
    const category = row.category || "uncategorized";
    categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    if (typeof row.estimated_value === "number") {
      const current = categoryValueTotals.get(category) || { sum: 0, count: 0 };
      categoryValueTotals.set(category, { sum: current.sum + row.estimated_value, count: current.count + 1 });
    }
  }

  const maxCategoryCount = Math.max(...categoryCount.values(), 1);

  const interim = opportunities.map((row) => {
    const category = row.category || "uncategorized";
    const avg = categoryValueTotals.get(category);
    const avgValue = avg && avg.count > 0 ? avg.sum / avg.count : 1;

    const demand = demandScore(categoryCount.get(category) || 0, maxCategoryCount);
    const value = valueScore(row.estimated_value, avgValue);
    const urgency = urgencyScore(row.closing_date);
    const base = computeScore({ demand_score: demand, value_score: value, urgency_score: urgency });

    return {
      opportunity_id: row.id,
      demand_score: Number(demand.toFixed(4)),
      value_score: Number(value.toFixed(4)),
      urgency_score: Number(urgency.toFixed(4)),
      base_score: Number(base.toFixed(4)),
      normalized_score: 0,
      computed_at: new Date().toISOString(),
    };
  });

  const minBase = Math.min(...interim.map((x) => x.base_score));
  const maxBase = Math.max(...interim.map((x) => x.base_score));

  const finalRows = interim.map((row) => ({
    ...row,
    normalized_score: normalizeScore(row.base_score, minBase, maxBase),
  }));

  const { error: upsertError } = await supabase
    .from("opportunity_features")
    .upsert(finalRows, { onConflict: "opportunity_id", ignoreDuplicates: false });

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });

  return NextResponse.json({ ok: true, processed: finalRows.length });
}
