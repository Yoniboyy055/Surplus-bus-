import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { captureError } from "@/lib/observability/errorTracker";
import { createClient } from "@/lib/supabase/server";

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

const isPermissionError = (error: SupabaseErrorLike) => {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42501" || message.includes("permission") || message.includes("jwt");
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceError = url.searchParams.get("test_error") === "1";

  if (forceError) {
    try {
      throw new Error("controlled_health_error");
    } catch (error) {
      captureError("/api/health", error, { controlled: true });
      return NextResponse.json({ ok: false, reason: "controlled_error" }, { status: 500 });
    }
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, reason: "supabase_not_configured" });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "supabase_not_configured" });
  }

  try {
    const { error } = await supabase.from("profiles").select("id", { head: true }).limit(1);

    if (error && !isPermissionError(error)) {
      captureError("/api/health", error, { phase: "db_connectivity_check" });
      return NextResponse.json({ ok: false, supabase: "error", detail: error.message ?? "unknown error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureError("/api/health", error, { phase: "unexpected_exception" });
    return NextResponse.json({ ok: false, reason: "health_exception" }, { status: 500 });
  }
}
