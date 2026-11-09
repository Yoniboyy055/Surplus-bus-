"use client";

import Link from "next/link";
import { useState } from "react";

export type InboxItem = {
  id: string;
  kind: "new_sold" | "new_tender" | "closing_soon" | "system";
  title: string;
  body: string | null;
  url: string | null;
  created_at: string;
  read_at: string | null;
  emailed_at: string | null;
};

export function InboxClient({ initial }: { initial: InboxItem[] }) {
  const [items, setItems] = useState(initial);
  const [err, setErr] = useState("");
  const unread = items.filter((i) => !i.read_at).length;

  async function markRead(id: string, read: boolean) {
    const res = await fetch(`/api/inbox/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read }) });
    if (!res.ok) return setErr("Couldn't update.");
    const { item } = await res.json();
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read_at: item.read_at } : x)));
  }
  async function readAll() {
    const res = await fetch("/api/inbox/read-all", { method: "POST" });
    if (!res.ok) return setErr("Couldn't update.");
    const now = new Date().toISOString();
    setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at || now })));
  }
  async function remove(id: string) {
    const res = await fetch(`/api/inbox/${id}`, { method: "DELETE" });
    if (!res.ok) return setErr("Couldn't delete.");
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  if (!items.length) {
    return (
      <div className="card text-center" data-state="empty">
        <h2 className="sb-title text-xl">Nothing new yet</h2>
        <p className="mt-1 text-sm text-[var(--sb-ink-soft)]">
          Turn on alerts for a <Link href="/saved" className="underline">saved search</Link>. Matches arrive after the next daily data refresh.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="chip" data-unread={unread}>{unread} unread</span>
        <button className="btn btn-ghost btn-sm" onClick={readAll} disabled={!unread}>Mark all read</button>
      </div>
      {err && <p role="alert" className="text-sm text-[var(--sb-danger-text)]">{err}</p>}
      <ul className="space-y-3" aria-label="Inbox items">
        {items.map((i) => {
          const external = i.url?.startsWith("http");
          return (
            <li key={i.id} className={`card space-y-1 ${i.read_at ? "!bg-[var(--sb-bg)] !shadow-none" : "border-[rgba(132,89,36,0.35)]"}`} data-read={i.read_at ? "1" : "0"}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-[var(--sb-ink)]">
                  {!i.read_at && <span className="sr-only">Unread: </span>}
                  {i.title}
                </h2>
                <time className="text-xs text-[var(--sb-ink-soft)]" dateTime={i.created_at}>
                  {new Date(i.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                </time>
              </div>
              {i.body && <p className="text-sm text-[var(--sb-ink-soft)]">{i.body}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {i.url &&
                  (external ? (
                    <a href={i.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm no-underline text-[var(--sb-ink)]" onClick={() => !i.read_at && markRead(i.id, true)}>
                      Official notice ↗
                    </a>
                  ) : (
                    <Link href={i.url} className="btn btn-outline btn-sm no-underline text-[var(--sb-ink)]" onClick={() => !i.read_at && markRead(i.id, true)}>
                      View comps
                    </Link>
                  ))}
                <button className="btn btn-ghost btn-sm" onClick={() => markRead(i.id, !i.read_at)}>{i.read_at ? "Mark unread" : "Mark read"}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(i.id)} aria-label={`Delete ${i.title}`}>Delete</button>
              </div>
              {i.emailed_at && <p className="text-xs text-[var(--sb-ink-soft)]">Also emailed {new Date(i.emailed_at).toLocaleDateString("en-CA")}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
