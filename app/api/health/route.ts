import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

const isPermissionError = (error: SupabaseErrorLike) => {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42501" || message.includes("permission") || message.includes("jwt");
};

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false });
  }

  const { error } = await supabase.from("profiles").select("id", { head: true }).limit(1);

  if (error && !isPermissionError(error)) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
