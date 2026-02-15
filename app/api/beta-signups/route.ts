import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { email, use_case } = await request.json();

  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (!supabase) return NextResponse.json({ ok: true, mode: "local" });

  const { error } = await supabase.from("beta_signups").upsert({ email, use_case: use_case ?? null }, { onConflict: "email" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
