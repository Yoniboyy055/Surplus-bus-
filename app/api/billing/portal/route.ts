import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { stripeConfigured, stripePost } from "@/lib/billing/stripe";
import { siteUrl } from "@/lib/email/unsubscribe";

/** Stripe Billing Portal (cancel / change card) for the signed-in subscriber. */
export async function POST() {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  if (!stripeConfigured()) return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  const { data: sub } = await supabase.from("subscriptions").select("provider_customer_id").eq("profile_id", user.id).maybeSingle();
  if (!sub?.provider_customer_id) return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  try {
    const s = await stripePost<{ url: string }>("billing_portal/sessions", { customer: sub.provider_customer_id, return_url: `${siteUrl()}/settings` });
    return NextResponse.json({ url: s.url });
  } catch (e) {
    console.error("[billing] portal failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "portal_failed" }, { status: 502 });
  }
}
