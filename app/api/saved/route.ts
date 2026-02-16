import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const { data } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id, created_at, opportunities(id, title, province, category, estimated_value, closing_date, source, status)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ saved: data || [] });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const body = await request.json();
  const { opportunity_id } = body;

  if (!opportunity_id) {
    return NextResponse.json({ error: "opportunity_id required" }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("saved_opportunities")
    .insert({ profile_id: user.id, opportunity_id })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  return NextResponse.json({ saved: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const url = new URL(request.url);
  const opportunity_id = url.searchParams.get("opportunity_id");

  if (!opportunity_id) {
    return NextResponse.json({ error: "opportunity_id required" }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("saved_opportunities")
    .delete()
    .eq("profile_id", user.id)
    .eq("opportunity_id", opportunity_id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
