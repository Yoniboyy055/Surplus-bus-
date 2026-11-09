import Link from "next/link";
import { requirePageUser } from "@/lib/account/session";
import { getUserLimits } from "@/lib/billing/entitlements";
import { ALERT_EMAIL_CONSENT_TEXT } from "@/lib/alerts/schemas";
import { ALERTS_HONESTY_NOTE } from "@/lib/billing/plans";
import { SavedSearchesClient, type SavedSearchRow } from "./SavedSearchesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved searches" };

export default async function SavedPage() {
  const { supabase, user } = await requirePageUser("/saved");
  const [{ data, error }, { data: pref }, limits] = await Promise.all([
    supabase
      .from("saved_searches")
      .select("id,name,query,scope,province,min_price,max_price,alert_frequency,alert_email,last_checked_at,last_alerted_at,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("user_preferences").select("alert_email_consent_at").eq("profile_id", user.id).maybeSingle(),
    getUserLimits(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sb-title text-[28px] text-[var(--sb-ink)]">Saved searches</h1>
          <p className="text-sm text-[var(--sb-ink-soft)]">
            We check these after each data refresh and put new matches in your <Link href="/inbox" className="underline">inbox</Link>.
          </p>
        </div>
        <span className="chip" data-limit={limits.savedSearches}>
          {(data || []).length} of {limits.savedSearches} used
        </span>
      </header>
      {error ? (
        <div className="banner danger" role="alert">
          We couldn't load your saved searches. Please refresh. If it keeps happening, the feature may still be being set up.
        </div>
      ) : (
        <SavedSearchesClient
          initial={(data || []) as SavedSearchRow[]}
          limit={limits.savedSearches}
          emailAllowed={limits.emailAlerts}
          consentAt={pref?.alert_email_consent_at ?? null}
          consentText={ALERT_EMAIL_CONSENT_TEXT}
        />
      )}
      <p className="text-xs text-[var(--sb-ink-soft)]">{ALERTS_HONESTY_NOTE}</p>
    </div>
  );
}
