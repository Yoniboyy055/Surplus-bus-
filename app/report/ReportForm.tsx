"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FILTERABLE_KINDS, KIND_LABEL, type LotKind } from "@/lib/opendata/kinds";
import { REPORT_REASONS } from "@/lib/opendata/lotReports";

type State = "idle" | "sending" | "done" | "error";
const MESSAGES: Record<string, string> = {
  not_enabled: "Reporting isn't switched on yet, so nothing was sent. Thanks for trying — please check back soon.",
  contact_details: "Please leave out email addresses and phone numbers. We don't need them to fix a result.",
  rate_limited: "That's a lot of reports in a short time. Please try again in a few minutes.",
  enough_reports: "This lot has already been reported several times today. We'll look at it.",
  not_found: "We couldn't find that lot any more.",
  invalid: "Pick a reason, then send.",
};

export function ReportForm({ feedKey, externalId, currentKind }: { feedKey: string; externalId: string; currentKind: LotKind }) {
  const router = useRouter();
  const [reason, setReason] = useState<string>("");
  const [kind, setKind] = useState<string>("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason) {
      setState("error");
      setMsg(MESSAGES.invalid!);
      return;
    }
    const website = (new FormData(e.currentTarget).get("website") as string) || "";
    setState("sending");
    setMsg("");
    const res = await fetch("/api/lot-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feed_key: feedKey, external_id: externalId, reason, suggested_kind: reason === "wrong_kind" && kind ? kind : null, note: note.trim() || null, website }),
    }).catch(() => null);
    if (res && res.status === 201) {
      setState("done");
      return;
    }
    const body = res ? await res.json().catch(() => ({})) : {};
    setState("error");
    setMsg(MESSAGES[(body as { error?: string }).error || ""] || "We couldn't send that right now. Please try again later.");
  }

  if (state === "done") {
    return (
      <div className="card space-y-3" role="status" data-testid="report-done">
        <p className="font-semibold text-[var(--sb-ink)]">Thanks — report received.</p>
        <p className="text-sm text-[var(--sb-ink-soft)]">We don&rsquo;t need anything else from you. Fixes show up after we review them.</p>
        <button type="button" className="btn btn-outline" onClick={() => router.back()}>Back to results</button>
      </div>
    );
  }

  return (
    <form className="card space-y-4" onSubmit={submit} data-testid="report-form" noValidate>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-[var(--sb-ink)]">What&rsquo;s wrong?</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r.value} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-[var(--sb-ink)] hover:bg-[var(--sb-surface)]">
            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="h-4 w-4" />
            {r.label}
          </label>
        ))}
      </fieldset>
      {reason === "wrong_kind" && (
        <div>
          <label htmlFor="suggested-kind" className="mb-1 block text-sm font-semibold text-[var(--sb-ink)]">Where does it belong? <span className="font-normal text-[var(--sb-ink-soft)]">(optional)</span></label>
          <select id="suggested-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="w-full">
            <option value="">Not sure</option>
            {FILTERABLE_KINDS.filter((k) => k !== currentKind).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="report-note" className="mb-1 block text-sm font-semibold text-[var(--sb-ink)]">Anything else? <span className="font-normal text-[var(--sb-ink-soft)]">(optional)</span></label>
        <textarea id="report-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={3} maxLength={500} className="w-full" aria-describedby="report-note-hint" />
        <p id="report-note-hint" className="mt-1 text-xs text-[var(--sb-ink-soft)]">No name, email or phone needed — please leave them out. {500 - note.length} characters left.</p>
      </div>
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {state === "error" && msg && <p className="text-sm text-[var(--sb-danger,#b42318)]" role="alert" data-testid="report-error">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send report"}</button>
        <button type="button" className="btn btn-outline" onClick={() => router.back()}>Cancel</button>
      </div>
      <p className="text-xs text-[var(--sb-ink-soft)]">We save only which lot, your reason and your note. No account, name or email. Your IP address is used for a few minutes to stop spam and is not saved with the report.</p>
    </form>
  );
}
