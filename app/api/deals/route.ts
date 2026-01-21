import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { property_type, max_price, criteria } = body;

  // 3️⃣ Buyer Criteria Guard
  if (!property_type || !max_price) {
    return NextResponse.json({ 
      error: "Missing required fields: property_type and max_price are mandatory." 
    }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can submit criteria" }, { status: 403 });
  }

  // Fetch a default referrer for MVP if none provided
  const { data: referrer } = await supabase.from("referrers").select("profile_id, commission_rate").limit(1).single();
  
  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      buyer_profile_id: user.id,
      referrer_profile_id: referrer?.profile_id,
      status: "NEW_SUBMISSION",
      buyer_track_snapshot: "B",
      referrer_fee_split_percent: referrer?.commission_rate || 20,
      operator_fee_split_percent: 100 - (referrer?.commission_rate || 20),
      criteria: { ...criteria, property_type, max_price }
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(deal);
}

export async function PUT(request: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { dealId, action, acceptedFee } = body;

  if (action === "COMMIT_TO_BID") {
    // 5️⃣ Buyer Commit Confirmation Guard
    if (!acceptedFee) {
      return NextResponse.json({ error: "You must accept the success fee to commit." }, { status: 400 });
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("status, buyer_profile_id")
      .eq("id", dealId)
      .single();

    if (!deal || deal.buyer_profile_id !== user.id) {
      return NextResponse.json({ error: "Deal not found or unauthorized" }, { status: 404 });
    }

    if (deal.status !== "EXCLUSIVE_WINDOW_ACTIVE") {
      return NextResponse.json({ error: "Deal is not in the exclusive window." }, { status: 400 });
    }

    const { error } = await supabase
      .from("deals")
      .update({ status: "BUYER_COMMITTED" })
      .eq("id", dealId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log
    await supabase.from("audit_logs").insert({
      deal_id: dealId,
      actor_profile_id: user.id,
      actor_role: "buyer",
      action: "BUYER_COMMITTED",
      from_status: "EXCLUSIVE_WINDOW_ACTIVE",
      to_status: "BUYER_COMMITTED",
      metadata: { acceptedFee: true }
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

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
  const { dealId, status, message, internal_note } = body;

  // 4️⃣ Operator Status Guards
  if (status === "NEEDS_CLARIFICATION" && !message) {
    return NextResponse.json({ 
      error: "Missing message: A clarification message to the buyer is required." 
    }, { status: 400 });
  }

  const { data: oldDeal } = await supabase.from("deals").select("status").eq("id", dealId).single();

  const { error } = await supabase
    .from("deals")
    .update({ status })
    .eq("id", dealId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabase.from("audit_logs").insert({
    deal_id: dealId,
    actor_profile_id: user.id,
    actor_role: "operator",
    action: "STATUS_CHANGE",
    from_status: oldDeal?.status,
    to_status: status,
    metadata: { message, internal_note }
  });

  return NextResponse.json({ success: true });
}
