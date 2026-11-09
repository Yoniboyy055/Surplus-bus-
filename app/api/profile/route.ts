import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { profilePatch } from "@/lib/account/schemas";

export async function GET() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const { data, error: queryError } = await supabase
    .from("profiles")
    .select("id,email,full_name,phone,role")
    .eq("id", user.id)
    .single();

  if (queryError) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const limited = await checkRateLimit(request, "profile-patch", 20, 60_000, user.id);
  if (limited) return limited;

  const parsed = profilePatch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  const { full_name, phone } = parsed.data;

  const { data, error: updateError } = await supabase
    .from("profiles")
    .update({ full_name: full_name ?? null, phone: phone ?? null })
    .eq("id", user.id)
    .select("id,email,full_name,phone,role")
    .single();

  if (updateError) {
    console.error("[profile] update failed:", updateError.message);
    return NextResponse.json({ error: "Couldn't save your profile." }, { status: 400 });
  }
  return NextResponse.json({ profile: data });
}
