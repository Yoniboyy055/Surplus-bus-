import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { savedSearchCreate } from "@/lib/alerts/schemas";
import { checkRateLimit } from "@/lib/security/rateLimit";

const COLS = "id,name,query,scope,province,min_price,max_price,alert_frequency,alert_email,last_checked_at,last_alerted_at,created_at";

export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const { data, error: e } = await supabase.from("saved_searches").select(COLS).order("created_at", { ascending: false });
  if (e) return NextResponse.json({ error: "Couldn't load saved searches." }, { status: 500 });
  return NextResponse.json({ saved_searches: data || [] });
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "saved-searches", 30, 60_000);
  if (limited) return limited;
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const parsed = savedSearchCreate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid saved search." }, { status: 400 });
  const { data, error: e } = await supabase
    .from("saved_searches")
    .insert({ ...parsed.data, profile_id: user.id })
    .select(COLS)
    .single();
  if (e) {
    if (/limit reached/i.test(e.message)) return NextResponse.json({ error: "You can keep up to 25 saved searches." }, { status: 409 });
    console.error("[saved-searches] insert failed:", e.message);
    return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 });
  }
  return NextResponse.json({ saved_search: data }, { status: 201 });
}
