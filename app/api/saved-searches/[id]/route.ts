import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { savedSearchPatch } from "@/lib/alerts/schemas";
import { getUserLimits } from "@/lib/billing/entitlements";

const COLS = "id,name,query,scope,province,min_price,max_price,alert_frequency,alert_email,last_checked_at,last_alerted_at,created_at";
const uuid = z.string().uuid();

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!uuid.safeParse(params.id).success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const parsed = savedSearchPatch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  if (parsed.data.alert_email === true) {
    const limits = await getUserLimits(supabase, user.id);
    if (!limits.emailAlerts) {
      return NextResponse.json({ error: "plan_limit", message: "Email alerts are part of Pro. In-app alerts are free." }, { status: 402 });
    }
    // CASL: email alerts need a recorded, express consent first.
    const { data: pref } = await supabase
      .from("user_preferences")
      .select("alert_email_consent_at")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!pref?.alert_email_consent_at) {
      return NextResponse.json({ error: "consent_required" }, { status: 409 });
    }
  }
  const { data, error: e } = await supabase
    .from("saved_searches")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .select(COLS);
  if (e) return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ saved_search: data[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!uuid.safeParse(params.id).success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const { data, error: e } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .select("id");
  if (e) return NextResponse.json({ error: "Couldn't delete." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
