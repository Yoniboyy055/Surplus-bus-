import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

/**
 * PATCH /api/payouts/[id]
 * Updates payout status.
 * 
 * PART 3.4: Payout Status Change Guard
 * - When marking as PAID: require internal_note
 * - Auto-write audit_logs entry with action = 'PAYOUT_PROCESSED'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const response = NextResponse.next();
  const supabase = createRouteHandlerClient(request, response);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { status, internal_note } = body;

  // PART 3.4: Payout Status Change Guard
  if (status === "paid") {
    if (!internal_note) {
      return NextResponse.json(
        { error: "Internal note required for payout status change to PAID" },
        { status: 400 }
      );
    }

    // Fetch payout to get deal_id for audit log
    const { data: payout } = await supabase
      .from("payouts")
      .select("deal_id, referrer_profile_id")
      .eq("id", params.id)
      .single();

    if (!payout) {
      return NextResponse.json(
        { error: "Payout not found" },
        { status: 404 }
      );
    }

    // Auto-write audit_logs entry
    await supabase.from("audit_logs").insert({
      deal_id: payout.deal_id,
      actor_profile_id: user.id,
      actor_role: "operator",
      action: "PAYOUT_PROCESSED",
      metadata: {
        payout_id: params.id,
        internal_note: internal_note,
      },
    });

    // Update payout status
    await supabase
      .from("payouts")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", params.id);
  }

  return NextResponse.json(
    { message: "Payout status updated", payoutId: params.id },
    { status: 200 }
  );
}
