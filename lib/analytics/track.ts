import { EVENTS } from "./catalog";

export type EventName = keyof typeof EVENTS;
type PropValue = string | number | boolean | null;
type Db = { from: (t: string) => any };

/** Server-side event tracking is off unless ANALYTICS_EVENTS_ENABLED=1. */
export function analyticsEnabled(): boolean {
  return process.env.ANALYTICS_EVENTS_ENABLED === "1";
}

export function isEventName(n: unknown): n is EventName {
  return typeof n === "string" && Object.prototype.hasOwnProperty.call(EVENTS, n);
}

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE = /(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/;
const IPV4 = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;
const SAFE_STRING = /^[A-Za-z0-9_./:@-]{0,64}$/;

/**
 * Keeps only catalogue keys; strings must be short identifier-like tokens (no spaces,
 * so no free text), and anything that looks like an email, phone or IP is dropped.
 * `path` loses its query string; `referrer_host` keeps only a host name.
 */
export function sanitizeProps(name: EventName, raw: unknown): Record<string, PropValue> {
  const allowed = EVENTS[name].props as readonly string[];
  const out: Record<string, PropValue> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.includes(k)) continue;
    if (v === null || typeof v === "boolean") out[k] = v as PropValue;
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.round(v * 100) / 100;
    else if (typeof v === "string") {
      let s = v.trim();
      if (k === "path") s = s.split(/[?#]/)[0]!;
      if (k === "referrer_host") {
        try {
          s = new URL(s.includes("://") ? s : `https://${s}`).hostname;
        } catch {
          continue;
        }
      }
      if (EMAIL.test(s) || PHONE.test(s) || IPV4.test(s) || !SAFE_STRING.test(s)) continue;
      out[k] = s;
    }
  }
  return out;
}

/**
 * Record one event. Never throws and never blocks the user flow on failure.
 * `db` must be a service-role client (RLS denies everyone else).
 */
export async function track(
  name: EventName,
  props: Record<string, unknown> = {},
  opts: { userId?: string | null; sessionId?: string | null; db?: Db } = {}
): Promise<boolean> {
  if (!analyticsEnabled()) return false;
  try {
    const db: Db = opts.db ?? (await import("@/lib/supabase/serviceRole")).createServiceRoleClient();
    const session = opts.sessionId && /^[A-Za-z0-9_-]{8,64}$/.test(opts.sessionId) ? opts.sessionId : null;
    const { error } = await db
      .from("analytics_events")
      .insert({ event_name: name, user_id: opts.userId ?? null, session_id: session, props: sanitizeProps(name, props) });
    if (error) console.error("[analytics] insert failed:", error.message);
    return !error;
  } catch (e) {
    console.error("[analytics] track failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
