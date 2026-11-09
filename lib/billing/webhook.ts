import { PLANS, planFromPriceId } from "./plans";
import { track } from "@/lib/analytics/track";

type Db = { from: (t: string) => any };

/** Apply a verified Stripe event to public.subscriptions (idempotent upserts). */
export async function applyStripeEvent(db: Db, event: { id: string; type: string; data: { object: any } }): Promise<{ handled: boolean; note?: string }> {
  const o = event.data.object || {};
  if (event.type === "checkout.session.completed") {
    const profileId = o.client_reference_id || o.metadata?.profile_id;
    if (!profileId || o.mode !== "subscription") return { handled: false, note: "not a subscription checkout" };
    const { error } = await db.from("subscriptions").upsert(
      {
        profile_id: profileId,
        tier: "pro",
        provider: "stripe",
        provider_customer_id: o.customer ?? null,
        provider_subscription_id: o.subscription ?? null,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );
    if (error) throw new Error(error.message);
    const planId = o.metadata?.plan_id as string | undefined;
    await track(
      "subscription_started",
      { plan_key: planId ?? "pro", billing_interval: planId === "pro_annual" ? "year" : "month" },
      { userId: profileId, db }
    );
    return { handled: true };
  }
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const profileId = o.metadata?.profile_id;
    const priceId = o.items?.data?.[0]?.price?.id;
    const plan = planFromPriceId(priceId) ?? (o.metadata?.plan_id && PLANS[o.metadata.plan_id as keyof typeof PLANS]) ?? null;
    const status = event.type === "customer.subscription.deleted" ? "canceled" : String(o.status || "inactive");
    const row = {
      tier: status === "active" || status === "trialing" ? plan?.tier ?? "pro" : "free",
      provider: "stripe",
      provider_customer_id: o.customer ?? null,
      provider_subscription_id: o.id ?? null,
      status,
      renews_at: o.current_period_end ? new Date(o.current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const q = profileId
      ? db.from("subscriptions").upsert({ profile_id: profileId, ...row }, { onConflict: "profile_id" })
      : db.from("subscriptions").update(row).eq("provider_subscription_id", o.id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { handled: true };
  }
  return { handled: false, note: "ignored event type" };
}
