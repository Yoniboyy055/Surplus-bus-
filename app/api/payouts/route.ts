import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "operator") {
    return NextResponse.json({ error: "Unauthorized: Operator access only" }, { status: 403 });
  }

  const body = await request.json();
  const { payoutId, status, internal_note } = body;

  // 6️⃣ Payout Processing Guard
  if (status === "paid" && !internal_note) {
    return NextResponse.json({ 
      error: "Missing internal note: A note is required when marking a payout as PAID." 
    }, { status: 400 });
  }

  const { data: payout } = await supabase.from("payouts").select("deal_id").eq("id", payoutId).single();

  const { error } = await supabase
    .from("payouts")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
    .eq("id", payoutId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  if (status === "paid") {
    await supabase.from("audit_logs").insert({
      deal_id: payout?.deal_id,
      actor_profile_id: user.id,
      actor_role: "operator",
      action: "PAYOUT_PROCESSED",
      metadata: { internal_note }
    });
  }

  return NextResponse.json({ success: true });
}
