"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  email: string;
  fullName: string;
  marketingConsentAt: string | null;
  alertEmailConsentAt: string | null;
  marketingText: string;
  alertText: string;
  plan: { name: string; price: string; paid: boolean; renews: string | null };
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

export function SettingsClient(p: Props) {
  const router = useRouter();
  const [name, setName] = useState(p.fullName);
  const [status, setStatus] = useState<{ kind: "ok" | "danger"; msg: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [marketingAgree, setMarketingAgree] = useState(false);

  async function call(key: string, url: string, init: RequestInit, ok: string) {
    setBusy(key);
    setStatus(null);
    try {
      const res = await fetch(url, init);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Try again.");
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      setStatus({ kind: "ok", msg: ok });
      router.refresh();
    } catch (e) {
      setStatus({ kind: "danger", msg: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }
  const json = (method: string, body?: unknown): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return (
    <div className="space-y-5">
      {status && (
        <div className={`banner ${status.kind}`} role={status.kind === "danger" ? "alert" : "status"}>
          {status.msg}
        </div>
      )}

      <section className="card space-y-3" aria-labelledby="profile-h">
        <h2 id="profile-h" className="sb-title text-lg">Profile</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            call("profile", "/api/profile", json("PATCH", { full_name: name.trim() || null }), "Profile saved.");
          }}
        >
          <div>
            <label htmlFor="full_name" className="mb-1 block text-sm font-semibold text-[var(--sb-ink)]">Name</label>
            <input id="full_name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} className="w-full max-w-sm" />
          </div>
          <div className="text-sm text-[var(--sb-ink-soft)]">
            Email: <span className="sb-mono text-[var(--sb-ink)]">{p.email}</span>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy === "profile"}>
            {busy === "profile" ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="card space-y-3" aria-labelledby="plan-h">
        <h2 id="plan-h" className="sb-title text-lg">Plan &amp; billing</h2>
        <p className="text-sm text-[var(--sb-ink)]">
          <strong>{p.plan.name}</strong> <span className="text-[var(--sb-ink-soft)]">· {p.plan.price}</span>
          {p.plan.paid && p.plan.renews && <span className="text-[var(--sb-ink-soft)]"> · renews {fmt(p.plan.renews)}</span>}
        </p>
        {p.plan.paid ? (
          <button className="btn btn-outline" disabled={busy === "portal"} onClick={() => call("portal", "/api/billing/portal", json("POST"), "")}>
            {busy === "portal" ? "Opening…" : "Manage billing or cancel"}
          </button>
        ) : (
          <Link href="/pricing" className="btn btn-primary no-underline">See Pro</Link>
        )}
      </section>

      <section className="card space-y-3" aria-labelledby="alerts-h">
        <h2 id="alerts-h" className="sb-title text-lg">Alert emails</h2>
        {p.alertEmailConsentAt ? (
          <>
            <p className="text-sm text-[var(--sb-ink-soft)]">
              You agreed on {fmt(p.alertEmailConsentAt)}: “{p.alertText}”
            </p>
            <button
              className="btn btn-outline"
              disabled={busy === "alerts"}
              onClick={() => call("alerts", "/api/preferences/alert-email", json("DELETE"), "Alert emails turned off. In-app alerts keep working.")}
            >
              Stop all alert emails
            </button>
          </>
        ) : (
          <p className="text-sm text-[var(--sb-ink-soft)]">
            Off. Matches still arrive in your <Link href="/inbox" className="underline text-[var(--sb-accent-700)]">inbox</Link>. Turn on email per
            search on <Link href="/saved" className="underline text-[var(--sb-accent-700)]">Saved searches</Link>.
          </p>
        )}
      </section>

      <section className="card space-y-3" aria-labelledby="mkt-h">
        <h2 id="mkt-h" className="sb-title text-lg">Product updates</h2>
        {p.marketingConsentAt ? (
          <>
            <p className="text-sm text-[var(--sb-ink-soft)]">Subscribed since {fmt(p.marketingConsentAt)}.</p>
            <button
              className="btn btn-outline"
              disabled={busy === "mkt"}
              onClick={() => call("mkt", "/api/preferences/marketing", json("DELETE"), "Unsubscribed from product updates.")}
            >
              Unsubscribe
            </button>
          </>
        ) : (
          <>
            <label className="flex items-start gap-3 text-sm text-[var(--sb-ink)]">
              <input type="checkbox" className="mt-1" checked={marketingAgree} onChange={(e) => setMarketingAgree(e.target.checked)} />
              <span>{p.marketingText}</span>
            </label>
            <button
              className="btn btn-outline"
              disabled={!marketingAgree || busy === "mkt"}
              onClick={() => call("mkt", "/api/preferences/marketing", json("POST", { consent: true }), "Subscribed to product updates.")}
            >
              Subscribe
            </button>
          </>
        )}
      </section>

      <section className="card space-y-2" aria-labelledby="acct-h">
        <h2 id="acct-h" className="sb-title text-lg">Your data</h2>
        <p className="text-sm text-[var(--sb-ink-soft)]">
          See the <Link href="/legal/privacy" className="underline text-[var(--sb-accent-700)]">privacy policy</Link> for how to get a copy of your data or
          delete your account.
        </p>
      </section>
    </div>
  );
}
