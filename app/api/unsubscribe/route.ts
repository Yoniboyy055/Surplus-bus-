import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function GET(req: NextRequest) {
  const limited = checkRateLimit(req, "unsubscribe", 30, 60_000);
  if (limited) return limited;

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const kind = (url.searchParams.get("kind") || "marketing").toLowerCase();

  if (!token) {
    return html(400, "Missing token.");
  }

  const supabase = createServiceRoleClient();

  const { data: pref, error } = await supabase
    .from("user_preferences")
    .select("profile_id, marketing_opt_in, news_opt_in")
    .eq("unsub_token", token)
    .single();

  if (error || !pref) return html(404, "Invalid unsubscribe link.");

  const patch: Record<string, boolean | string> = {};
  if (kind === "news") patch.news_opt_in = false;
  else patch.marketing_opt_in = false;

  const { error: updErr } = await supabase
    .from("user_preferences")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("profile_id", pref.profile_id);

  if (updErr) return html(500, "Unsubscribe failed. Try again later.");

  return html(200, "You are unsubscribed.");
}

function html(status: number, message: string) {
  return new NextResponse(
    `<!doctype html><html><body style="font-family:system-ui;padding:32px">
      <h2>${message}</h2>
    </body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
