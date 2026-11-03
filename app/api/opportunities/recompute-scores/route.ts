import { NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth/requireUser";
import { scoreOpportunityV2 } from "@/lib/intelligence/scoring";

export async function POST() {
  const { supabase, error } = await requireOperator();
  if (error || !supabase) return error!;

  const { data: opportunities, error: oppError } = await supabase
    .from("opportunities")
    .select("id,category,province,estimated_value,closing_date,source_url,first_seen_at,status,created_at")
    .neq("status", "closed");

  if (oppError) return NextResponse.json({ error: oppError.message }, { status: 400 });
  if (!opportunities?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  // Category medians for value factor
  const byCat = new Map<string, number[]>();
  for (const row of opportunities) {
    if (typeof row.estimated_value === "number") {
      const cat = row.category || "uncategorized";
      const arr = byCat.get(cat) || [];
      arr.push(row.estimated_value);
      byCat.set(cat, arr);
    }
  }
  const medianOf = (vals: number[]) => {
    if (!vals.length) return null;
    const s = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
  };

  const finalRows = [];
  for (const row of opportunities) {
    const cat = row.category || "uncategorized";
    const result = scoreOpportunityV2(
      {
        id: row.id,
        category: row.category,
        province: row.province,
        estimated_value: row.estimated_value,
        closing_date: row.closing_date,
        source_url: row.source_url,
        first_seen_at: row.first_seen_at || row.created_at,
        status: row.status,
      },
      { categoryMedian: medianOf(byCat.get(cat) || []) }
    );
    if (result.excluded) continue;

    const timePart = result.parts.find((p) => p.id === "time");
    const valuePart = result.parts.find((p) => p.id === "value");
    finalRows.push({
      opportunity_id: row.id,
      demand_score: 0, // retired — fit is personalised at read time
      value_score: Number(((valuePart?.earned || 0) / 20).toFixed(4)),
      urgency_score: Number(((timePart?.earned || 0) / 25).toFixed(4)),
      base_score: result.score,
      normalized_score: result.score,
      computed_at: new Date().toISOString(),
    });
  }

  if (!finalRows.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const { error: upsertError } = await supabase
    .from("opportunity_features")
    .upsert(finalRows, { onConflict: "opportunity_id", ignoreDuplicates: false });

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });

  return NextResponse.json({ ok: true, processed: finalRows.length, score_version: 2 });
}
