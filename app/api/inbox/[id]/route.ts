import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";

const uuid = z.string().uuid();
const body = z.object({ read: z.boolean() }).strict();

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!uuid.safeParse(params.id).success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  const { data, error: e } = await supabase
    .from("inbox_items")
    .update({ read_at: parsed.data.read ? new Date().toISOString() : null })
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .select("id,read_at");
  if (e) return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: data[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!uuid.safeParse(params.id).success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const { data, error: e } = await supabase
    .from("inbox_items")
    .delete()
    .eq("id", params.id)
    .eq("profile_id", user.id)
    .select("id");
  if (e) return NextResponse.json({ error: "Couldn't delete." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
