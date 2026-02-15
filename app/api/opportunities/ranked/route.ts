import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { personalizedScore, urgencyScore } from "@/lib/intelligence/scoring";

export async function GET(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);

  const { data: pref } = await supabase
    .from("user_preferences")
    .select("provinces,categories,min_value,max_value,urgency_days")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: rows, error: rankedError } = await supabase
    .from("opportunity_features")
    .select(
      "normalized_score,demand_score,value_score,urgency_score,opportunity_id,opportunities(id,title,province,category,estimated_value,closing_date,source,status)"
    )
    .order("normalized_score", { ascending: false })
    .limit(limit * 3);

  if (rankedError) return NextResponse.json({ error: rankedError.message }, { status: 400 });

  const provinces = pref?.provinces || [];
  const categories = pref?.categories || [];
  const minValue = pref?.min_value ?? null;
  const maxValue = pref?.max_value ?? null;
  const urgencyDays = pref?.urgency_days ?? 7;

  const scored = (rows || [])
    .map((row: any) => {
      const opp = row.opportunities;
      if (!opp) return null;

      const provinceMatch = provinces.length ? Number(provinces.includes(opp.province)) : 0;
      const categoryMatch = categories.length ? Number(categories.includes(opp.category)) : 0;
      const valueMatch =
        minValue !== null && maxValue !== null && typeof opp.estimated_value === "number"
          ? Number(opp.estimated_value >= minValue && opp.estimated_value <= maxValue)
          : 0;
      const urgencyMatch = Number(urgencyScore(opp.closing_date) >= urgencyScore(new Date(Date.now() + urgencyDays * 86400000).toISOString()));

      const userScore = personalizedScore(row.normalized_score, {
        province_match: provinceMatch,
        category_match: categoryMatch,
        value_match: valueMatch,
        urgency_match: urgencyMatch,
      });

      return {
        id: opp.id,
        title: opp.title,
        source: opp.source,
        province: opp.province,
        category: opp.category,
        estimated_value: opp.estimated_value,
        closing_date: opp.closing_date,
        status: opp.status,
        score: userScore,
        score_breakdown: {
          base_normalized: row.normalized_score,
          demand: row.demand_score,
          value: row.value_score,
          urgency: row.urgency_score,
        },
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json({ opportunities: scored });
}
