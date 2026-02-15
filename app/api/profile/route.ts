import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const { data, error: queryError } = await supabase
    .from("profiles")
    .select("id,email,full_name,phone,role")
    .eq("id", user.id)
    .single();

  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 404 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const body = await request.json();
  const { full_name, phone } = body;

  const { data, error: updateError } = await supabase
    .from("profiles")
    .update({ full_name: full_name ?? null, phone: phone ?? null })
    .eq("id", user.id)
    .select("id,email,full_name,phone,role")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}
