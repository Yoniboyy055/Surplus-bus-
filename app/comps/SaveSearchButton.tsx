"use client";

import { useState } from "react";
import Link from "next/link";

/** Persists a saved search via /api/saved-searches. Honest about sign-in and failures. */
export function SaveSearchButton({ q, province, scope = "sold" }: { q: string; province?: string | null; scope?: "all" | "sold" | "tenders" }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "signin" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, province: province || null, scope }),
      });
      if (res.status === 401) return setState("signin");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(body?.error || "Couldn't save. Try again.");
        return setState("error");
      }
      setState("saved");
    } catch {
      setMsg("Couldn't save. Try again.");
      setState("error");
    }
  }

  if (state === "signin") {
    const cb = `/comps?q=${encodeURIComponent(q)}${province ? `&province=${province}` : ""}`;
    return (
      <Link href={`/auth?callbackUrl=${encodeURIComponent(cb)}`} className="btn btn-primary no-underline">
        Sign in to save this search
      </Link>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" className="btn btn-primary" onClick={save} disabled={state === "saving" || state === "saved"}>
        {state === "saved" ? "Saved ✓" : state === "saving" ? "Saving…" : "Save this search"}
      </button>
      <span role="status" aria-live="polite" className="text-xs text-[var(--sb-ink-soft)]">
        {state === "saved" && (
          <>
            Saved. Turn on alerts in <Link href="/saved" className="underline">Saved searches</Link>.
          </>
        )}
        {state === "error" && <span className="text-[var(--sb-danger)]">{msg}</span>}
      </span>
    </div>
  );
}
