import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const { error: e } = await supabase
    .from("inbox_items")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("read_at", null);
  if (e) return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
