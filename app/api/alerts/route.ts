import { alertRuleCreate, readJson } from "@/lib/account/legacyAlertSchemas";
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
  const { error: delError, data } = await supabase
    .from("alert_rules")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id)
    .select();

  if (delError) {
    console.error("[alerts]", delError.message);
    return NextResponse.json({ error: "request_failed" }, { status: 400 });
  }
  if (!data || data.length === 0) {
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

  const parsed = alertRuleCreate.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const { category, min_price, max_price, region, channel } = parsed.data;

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

  if (insertError) {

    console.error("[alerts]", insertError.message);

    return NextResponse.json({ error: "request_failed" }, { status: 400 });

  }
  return NextResponse.json({ alert: data }, { status: 201 });
}
