import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { checkRateLimit } from "@/lib/security/rateLimit";

/**
 * Unsubscribe.
 * - POST (RFC 8058 one-click, from the mail client's List-Unsubscribe-Post, or
 *   the confirm button on /unsubscribe): unsubscribes immediately.
 * - GET: never changes state (link scanners prefetch GETs). Redirects to the
 *   confirm page.
 * Unknown/invalid tokens get the same neutral response (no enumeration).
 */
const KINDS = new Set(["marketing", "news", "alerts", "all"]);
const TOKEN_RE = /^[A-Za-z0-9-]{16,64}$/;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const to = new URL("/unsubscribe", url.origin);
  const token = url.searchParams.get("token");
  const kind = url.searchParams.get("kind");
  if (token) to.searchParams.set("token", token);
  if (kind) to.searchParams.set("kind", kind);
  return NextResponse.redirect(to, 303);
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, "unsubscribe", 30, 60_000);
  if (limited) return limited;

  const url = new URL(req.url);
  let token = url.searchParams.get("token") || "";
  let kind = (url.searchParams.get("kind") || "marketing").toLowerCase();
  const ctype = req.headers.get("content-type") || "";
  if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (form) {
      token = String(form.get("token") || token);
      kind = String(form.get("kind") || kind).toLowerCase();
    }
  } else if (ctype.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    token = String(body.token || token);
    kind = String(body.kind || kind).toLowerCase();
  }
  if (!KINDS.has(kind)) kind = "marketing";
  const wantsHtml = (req.headers.get("accept") || "").includes("text/html");
  const done = () =>
    wantsHtml
      ? NextResponse.redirect(new URL(`/unsubscribe?done=1&kind=${kind}`, url.origin), 303)
      : NextResponse.json({ ok: true });

  if (!TOKEN_RE.test(token)) return done();

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Unsubscribe is temporarily unavailable. Reply 'unsubscribe' to any email." }, { status: 503 });
  }

  const { data: pref, error } = await supabase
    .from("user_preferences")
    .select("profile_id")
    .eq("unsub_token", token)
    .maybeSingle();
  if (error) {
    console.error("[unsubscribe] lookup failed:", error.message);
    return NextResponse.json({ error: "Unsubscribe failed. Try again later." }, { status: 500 });
  }
  if (!pref) return done(); // unknown token: same neutral answer

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (kind === "news" || kind === "all") patch.news_opt_in = false;
  if (kind === "marketing" || kind === "all") patch.marketing_opt_in = false;
  if (kind === "alerts" || kind === "all") {
    patch.alert_email_consent_at = null;
    patch.alert_email_consent_text = null;
  }
  const { error: updErr } = await supabase.from("user_preferences").update(patch).eq("profile_id", pref.profile_id);
  if (updErr) {
    console.error("[unsubscribe] update failed:", updErr.message);
    return NextResponse.json({ error: "Unsubscribe failed. Try again later." }, { status: 500 });
  }
  if (kind === "alerts" || kind === "all") {
    await supabase.from("saved_searches").update({ alert_email: false }).eq("profile_id", pref.profile_id);
  }
  return done();
}
