import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { marketingConsent, MARKETING_CONSENT_TEXT } from "@/lib/account/schemas";

/** Opt in (POST, records CASL express consent) or out (DELETE) of product-update emails. */
export async function POST(request: NextRequest) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  if (!marketingConsent.safeParse(await request.json().catch(() => null)).success)
    return NextResponse.json({ error: "Tick the box to agree." }, { status: 400 });
  const now = new Date().toISOString();
  const { error: e } = await supabase.from("user_preferences").upsert(
    { profile_id: user.id, marketing_opt_in: true, marketing_consent_at: now, marketing_consent_text: MARKETING_CONSENT_TEXT, updated_at: now },
    { onConflict: "profile_id" }
  );
  if (e) {
    console.error("[marketing] consent save failed:", e.message);
    return NextResponse.json({ error: "Couldn't save your choice." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, consent_at: now });
}

export async function DELETE() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const { error: e } = await supabase
    .from("user_preferences")
    .update({ marketing_opt_in: false, marketing_consent_at: null, marketing_consent_text: null, updated_at: new Date().toISOString() })
    .eq("profile_id", user.id);
  if (e) return NextResponse.json({ error: "Couldn't save your choice." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
