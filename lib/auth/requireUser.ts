import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = createClient();
  if (!supabase) {
    return { supabase: null, user: null, error: NextResponse.json({ error: "Supabase not configured" }, { status: 500 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { supabase, user, error: null };
}

export async function requireOperator() {
  const base = await requireUser();
  if (base.error || !base.supabase || !base.user) return base;

  const { data: profile } = await base.supabase
    .from("profiles")
    .select("role")
    .eq("id", base.user.id)
    .single();

  if (profile?.role !== "operator") {
    return {
      ...base,
      error: NextResponse.json({ error: "Forbidden: operator role required" }, { status: 403 }),
    };
  }

  return base;
}
