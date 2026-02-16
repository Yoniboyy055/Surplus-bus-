import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const { id } = await params;
  const body = await request.json();
  const { category, min_price, max_price, region, channel, is_active } = body;

  const updates: Record<string, unknown> = {};
  if (category !== undefined) updates.category = category;
  if (min_price !== undefined) updates.min_price = min_price;
  if (max_price !== undefined) updates.max_price = max_price;
  if (region !== undefined) updates.region = region;
  if (channel !== undefined) updates.channel = channel;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error: updateError } = await supabase
    .from("alert_rules")
    .update(updates)
    .eq("id", id)
    .eq("profile_id", user.id)
    .select("*")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ alert: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const { id } = await params;

  const { error: deleteError } = await supabase
    .from("alert_rules")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
