import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can update criteria" }, { status: 403 });
  }

  const body = await request.json();
  const { dealId, property_type, max_price, location, notes } = body;

  if (!dealId || !property_type || !max_price) {
    return NextResponse.json({ error: "Missing required fields for criteria update." }, { status: 400 });
  }

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, status, buyer_profile_id, criteria")
    .eq("id", dealId)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }

  if (deal.buyer_profile_id !== auth.user.id) {
    return NextResponse.json({ error: "Unauthorized to update this deal." }, { status: 403 });
  }

  const allowedStatuses = ["NEW_SUBMISSION", "NEEDS_CLARIFICATION"];
  if (!allowedStatuses.includes(deal.status)) {
    return NextResponse.json({ error: "Criteria updates are not allowed in the current status." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Service credentials not configured." }, { status: 500 });
  }

  const adminClient = createAdminClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const updatedCriteria = {
    ...(deal.criteria || {}),
    property_type,
    max_price,
    location,
    notes,
  };

  const { error: updateError } = await adminClient
    .from("deals")
    .update({ criteria: updatedCriteria })
    .eq("id", dealId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
