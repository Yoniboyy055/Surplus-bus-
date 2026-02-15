import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(request: Request) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;

  const { tier, provider, provider_customer_id, provider_subscription_id, status } = await request.json();
  if (!tier) return NextResponse.json({ error: "tier required" }, { status: 400 });

  const { data, error: upsertError } = await supabase
    .from("subscriptions")
    .upsert({
      profile_id: user.id,
      tier,
      provider: provider ?? "stripe",
      provider_customer_id: provider_customer_id ?? null,
      provider_subscription_id: provider_subscription_id ?? null,
      status: status ?? "trialing",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });
  return NextResponse.json({ subscription: data });
}
