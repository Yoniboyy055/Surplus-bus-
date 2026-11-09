"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export type SavedSearchRow = {
  id: string;
  name: string | null;
  query: string;
  scope: "all" | "sold" | "tenders";
  province: string | null;
  alert_frequency: "off" | "daily" | "weekly";
  alert_email: boolean;
  last_checked_at: string | null;
  last_alerted_at: string | null;
  created_at: string;
};

const SCOPE_LABEL = { all: "Sold lots + tenders", sold: "Sold lots", tenders: "Tenders" } as const;

export function SavedSearchesClient({
  initial,
  limit,
  emailAllowed,
  consentAt,
  consentText,
}: {
  initial: SavedSearchRow[];
  limit: number;
  emailAllowed: boolean;
  consentAt: string | null;
  consentText: string;
}) {
  const [rows, setRows] = useState(initial);
  const [consent, setConsent] = useState(consentAt);
  const [askConsentFor, setAskConsentFor] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | "sold" | "tenders">("all");
  const [busy, setBusy] = useState(false);

  async function patch(id: string, body: Partial<SavedSearchRow>) {
    const res = await fetch(`/api/saved-searches/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.error === "consent_required") {
      setAskConsentFor(id);
      return;
    }
    if (!res.ok) {
      setMsg({ tone: "err", text: data.message || "Couldn't save that change." });
      return;
    }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...data.saved_search } : x)));
    setMsg({ tone: "ok", text: "Saved." });
  }

  async function giveConsent() {
    const res = await fetch("/api/preferences/alert-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true }) });
    if (!res.ok) return setMsg({ tone: "err", text: "Couldn't record your choice." });
    const d = await res.json();
    setConsent(d.consent_at);
    const id = askConsentFor;
    setAskConsentFor(null);
    setAgree(false);
    if (id) await patch(id, { alert_email: true });
  }

  async function remove(id: string) {
    const res = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    if (!res.ok) return setMsg({ tone: "err", text: "Couldn't delete." });
    setRows((r) => r.filter((x) => x.id !== id));
    setMsg({ tone: "ok", text: "Deleted." });
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    const res = await fetch("/api/saved-searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q.trim(), scope }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ tone: "err", text: data.message || data.error || "Couldn't save." });
    setRows((r) => [data.saved_search, ...r]);
    setQ("");
    setMsg({ tone: "ok", text: "Saved. Turn on alerts below." });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card flex flex-wrap items-end gap-3" aria-label="Add a saved search">
        <label className="flex min-w-[200px] flex-1 flex-col text-sm text-[var(--sb-ink-soft)]">
          Search words
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="pickup truck" className="mt-1" maxLength={200} />
        </label>
        <label className="flex flex-col text-sm text-[var(--sb-ink-soft)]">
          Look in
          <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="mt-1">
            <option value="all">Sold lots + tenders</option>
            <option value="sold">Sold lots</option>
            <option value="tenders">Tenders</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy || rows.length >= limit}>
          {busy ? "Saving…" : "Save search"}
        </button>
        {rows.length >= limit && (
          <p className="w-full text-sm text-[var(--sb-ink-soft)]">
            You’ve used all {limit} saved search{limit === 1 ? "" : "es"} on your plan. <Link href="/pricing" className="underline">See Pro</Link>
          </p>
        )}
      </form>

      <p role="status" aria-live="polite" className={`min-h-[1.25rem] text-sm ${msg?.tone === "err" ? "text-[var(--sb-danger-text)]" : "text-[var(--sb-ok-text)]"}`}>
        {msg?.text}
      </p>

      {askConsentFor && (
        <div className="card border-[rgba(132,89,36,0.35)]" role="dialog" aria-labelledby="consent-title">
          <h2 id="consent-title" className="sb-title text-lg">Turn on email alerts?</h2>
          <label className="mt-2 flex items-start gap-2 text-sm text-[var(--sb-ink)]">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            <span>{consentText}</span>
          </label>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary btn-sm" disabled={!agree} onClick={giveConsent}>Agree and turn on</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAskConsentFor(null); setAgree(false); }}>Not now</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card text-center" data-state="empty">
          <h2 className="sb-title text-xl">No saved searches yet</h2>
          <p className="mt-1 text-sm text-[var(--sb-ink-soft)]">
            Save a search above, or from any <Link href="/comps" className="underline">comps</Link> page.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Your saved searches">
          {rows.map((r) => (
            <li key={r.id} className="card space-y-3" data-saved-search={r.query}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="sb-title text-lg text-[var(--sb-ink)]">{r.name || r.query}</h2>
                  <p className="text-sm text-[var(--sb-ink-soft)]">
                    {SCOPE_LABEL[r.scope]}
                    {r.province ? ` · ${r.province}` : ""}
                    {r.last_checked_at ? ` · last checked ${new Date(r.last_checked_at).toLocaleDateString("en-CA")}` : " · not checked yet"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/comps?q=${encodeURIComponent(r.query)}`} className="btn btn-outline btn-sm no-underline text-[var(--sb-ink)]">View comps</Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(r.id)} aria-label={`Delete saved search ${r.query}`}>Delete</button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2 text-[var(--sb-ink)]">
                  Alerts
                  <select
                    aria-label={`Alert frequency for ${r.query}`}
                    value={r.alert_frequency}
                    onChange={(e) => patch(r.id, { alert_frequency: e.target.value as SavedSearchRow["alert_frequency"] })}
                  >
                    <option value="off">Off</option>
                    <option value="daily">Daily (in-app)</option>
                    <option value="weekly">Weekly (in-app)</option>
                  </select>
                </label>
                <label className={`flex items-center gap-2 ${emailAllowed ? "text-[var(--sb-ink)]" : "text-[var(--sb-ink-soft)]"}`}>
                  <input
                    type="checkbox"
                    checked={r.alert_email}
                    disabled={!emailAllowed || r.alert_frequency === "off"}
                    onChange={(e) => patch(r.id, { alert_email: e.target.checked })}
                  />
                  Also email me {emailAllowed ? "" : "(Pro)"}
                </label>
                {r.alert_email && !consent && <span className="text-xs text-[var(--sb-warn-text)]">Email paused: consent needed</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
