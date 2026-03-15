import { z } from "zod";

export async function DELETE(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const idSchema = z.string().uuid();
  const parse = idSchema.safeParse(id);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Double-check profile_id in WHERE
  const { error: delError, count } = await supabase
    .from("alert_rules")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("id", { count: "exact" });

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 400 });
  }
  if (!count) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const { data } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ alerts: data || [] });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const body = await request.json();
  const { category, min_price, max_price, region, channel } = body;

  if (!category || !channel) {
    return NextResponse.json({ error: "category and channel are required" }, { status: 400 });
  }

  const payload = {
    profile_id: user.id,
    category,
    min_price: min_price ?? null,
    max_price: max_price ?? null,
    region: region ?? null,
    channel,
    is_active: true,
  };
  const { data, error: insertError } = await supabase.from("alert_rules").insert(payload).select("*").single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  return NextResponse.json({ alert: data }, { status: 201 });
}
