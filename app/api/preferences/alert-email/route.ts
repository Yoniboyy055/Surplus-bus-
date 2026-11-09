import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { alertEmailConsent, ALERT_EMAIL_CONSENT_TEXT } from "@/lib/alerts/schemas";

/** Record (POST) or withdraw (DELETE) express consent for alert emails (CASL). */
export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const { data } = await supabase
    .from("user_preferences")
    .select("alert_email_consent_at,alert_email_consent_text")
    .eq("profile_id", user.id)
    .maybeSingle();
  return NextResponse.json({ consent_at: data?.alert_email_consent_at ?? null, consent_text: ALERT_EMAIL_CONSENT_TEXT });
}

export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const parsed = alertEmailConsent.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Tick the box to agree." }, { status: 400 });
  const now = new Date().toISOString();
  const { error: e } = await supabase
    .from("user_preferences")
    .upsert(
      { profile_id: user.id, alert_email_consent_at: now, alert_email_consent_text: ALERT_EMAIL_CONSENT_TEXT, updated_at: now },
      { onConflict: "profile_id" }
    );
  if (e) {
    console.error("[alert-email] consent save failed:", e.message);
    return NextResponse.json({ error: "Couldn't save your choice." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, consent_at: now });
}

export async function DELETE() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const now = new Date().toISOString();
  const { error: e } = await supabase
    .from("user_preferences")
    .update({ alert_email_consent_at: null, alert_email_consent_text: null, updated_at: now })
    .eq("profile_id", user.id);
  if (e) return NextResponse.json({ error: "Couldn't save your choice." }, { status: 500 });
  await supabase.from("saved_searches").update({ alert_email: false }).eq("profile_id", user.id);
  return NextResponse.json({ ok: true });
}
