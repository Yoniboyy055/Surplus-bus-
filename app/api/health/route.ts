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
    return NextResponse.json({ ok: false, reason: "supabase_not_configured" });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "supabase_not_configured" });
  }

  const { error } = await supabase.from("profiles").select("id", { head: true }).limit(1);

  if (error && !isPermissionError(error)) {
    return NextResponse.json(
      { ok: false, supabase: "error", detail: error.message ?? "unknown error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
