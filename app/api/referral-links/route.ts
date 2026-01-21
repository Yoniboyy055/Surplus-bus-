import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "referrer") {
    return NextResponse.json({ error: "Unauthorized: Referrer access only" }, { status: 403 });
  }

  const code = nanoid(10);

  const { data: link, error } = await supabase
    .from("referral_links")
    .insert({
      referrer_profile_id: user.id,
      code: code,
      is_active: true
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(link);
}
