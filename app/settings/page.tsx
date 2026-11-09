import { requirePageUser } from "@/lib/account/session";
import { MARKETING_CONSENT_TEXT } from "@/lib/account/schemas";
import { ALERT_EMAIL_CONSENT_TEXT } from "@/lib/alerts/schemas";
import { PLANS, formatPlanPrice } from "@/lib/billing/plans";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requirePageUser("/settings");
  const [{ data: profile }, { data: pref }, { data: sub }] = await Promise.all([
    supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
    supabase
      .from("user_preferences")
      .select("marketing_opt_in,marketing_consent_at,alert_email_consent_at")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase.from("subscriptions").select("tier,status,renews_at").eq("profile_id", user.id).maybeSingle(),
  ]);
  const active = !!sub && ["active", "trialing"].includes(String(sub.status)) && sub.tier === "pro";
  const plan = active ? PLANS.pro_monthly : PLANS.free;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-0">
      <h1 className="sb-title text-[28px] text-[var(--sb-ink)]">Settings</h1>
      <SettingsClient
        email={profile?.email || user.email || ""}
        fullName={profile?.full_name || ""}
        marketingConsentAt={pref?.marketing_opt_in ? pref?.marketing_consent_at ?? null : null}
        alertEmailConsentAt={pref?.alert_email_consent_at ?? null}
        marketingText={MARKETING_CONSENT_TEXT}
        alertText={ALERT_EMAIL_CONSENT_TEXT}
        plan={{
          name: plan.name,
          price: active ? "Pro" : formatPlanPrice(plan),
          paid: active,
          renews: sub?.renews_at ?? null,
        }}
      />
    </div>
  );
}
