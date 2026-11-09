import { NextRequest, NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/billing/stripe";
import { applyStripeEvent } from "@/lib/billing/webhook";

/** Stripe webhook. Verifies the signature over the raw body; fails closed. */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  let db;
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    db = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }
  try {
    const r = await applyStripeEvent(db, event);
    return NextResponse.json({ received: true, ...r });
  } catch (e) {
    console.error("[billing] webhook apply failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "apply_failed" }, { status: 500 }); // Stripe retries
  }
}
