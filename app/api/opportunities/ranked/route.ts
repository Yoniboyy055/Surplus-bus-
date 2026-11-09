import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { scoreOpportunityV2 } from "@/lib/intelligence/scoring";

export async function GET(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);

  const { data: pref } = await supabase
    .from("user_preferences")
    .select("provinces,categories,min_value,max_value,urgency_days")
    .eq("user_id", user.id)
    .maybeSingle();

  // Prefer profile_id column if that is what the schema uses
  let preferences = pref;
  if (!preferences) {
    const { data: pref2 } = await supabase
      .from("user_preferences")
      .select("provinces,categories,min_value,max_value,urgency_days")
      .eq("profile_id", user.id)
      .maybeSingle();
    preferences = pref2;
  }

  const { data: rows, error: listError } = await supabase
    .from("opportunities")
    .select("id,title,province,category,estimated_value,closing_date,source,source_url,status,first_seen_at,created_at")
    .neq("status", "closed")
    .limit(500);

  if (listError) {

    console.error("[opportunities/ranked]", listError.message);

    return NextResponse.json({ error: "request_failed" }, { status: 400 });

  }

  const prefs = {
    provinces: preferences?.provinces || [],
    categories: preferences?.categories || [],
    min_value: preferences?.min_value ?? null,
    max_value: preferences?.max_value ?? null,
  };

  const byCat = new Map<string, number[]>();
  for (const row of rows || []) {
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

  const scored = (rows || [])
    .map((opp) => {
      const cat = opp.category || "uncategorized";
      const result = scoreOpportunityV2(
        {
          id: opp.id,
          category: opp.category,
          province: opp.province,
          estimated_value: opp.estimated_value,
          closing_date: opp.closing_date,
          source_url: opp.source_url,
          first_seen_at: opp.first_seen_at || opp.created_at,
          status: opp.status,
        },
        { prefs, categoryMedian: medianOf(byCat.get(cat) || []) }
      );
      if (result.excluded) return null;
      return {
        id: opp.id,
        title: opp.title,
        source: opp.source,
        source_url: opp.source_url,
        province: opp.province,
        category: opp.category,
        estimated_value: opp.estimated_value,
        closing_date: opp.closing_date,
        status: opp.status,
        score: result.score,
        score_reasons: result.reasons,
        score_parts: result.parts,
        score_version: 2,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      const ad = a.closing_date ? new Date(a.closing_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.closing_date ? new Date(b.closing_date).getTime() : Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return (b.estimated_value || 0) - (a.estimated_value || 0);
    })
    .slice(0, limit);

  return NextResponse.json({ opportunities: scored });
}
