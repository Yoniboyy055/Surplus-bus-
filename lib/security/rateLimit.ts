import { NextRequest, NextResponse } from "next/server";

/**
 * Sliding/fixed-window rate limiting.
 *
 * - When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, counts live in Redis
 *   (shared by every serverless instance) using a fixed window: INCR + PEXPIRE NX.
 * - Otherwise falls back to a per-instance in-memory window. That only slows a single
 *   warm instance and is NOT a real limit on Vercel; production needs the shared store
 *   (listed in the review package approvals).
 * - Client IP comes from headers Vercel sets itself (x-vercel-forwarded-for, x-real-ip).
 *   A client-supplied first X-Forwarded-For hop is never trusted.
 */

type Bucket = { hits: number[]; lastSeenAt: number };
const buckets = new Map<string, Bucket>();
let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 60_000;

export function clientIp(request: Request | NextRequest): string {
  if ("ip" in request && typeof request.ip === "string" && request.ip.length > 0) return request.ip;
  const h = request.headers;
  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  // Last hop is the one appended by the nearest proxy; the first hop is client-controlled.
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((s) => s.trim()).filter(Boolean);
    return hops[hops.length - 1] || "unknown";
  }
  return "unknown";
}

function sweep(now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  for (const [k, b] of buckets.entries()) if (b.lastSeenAt < now - SWEEP_INTERVAL_MS) buckets.delete(k);
  lastSweepAt = now;
}

function memoryHit(bucketKey: string, limit: number, windowMs: number): { ok: boolean; retryMs: number } {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(bucketKey) ?? { hits: [], lastSeenAt: now };
  b.hits = b.hits.filter((ts) => now - ts < windowMs);
  b.lastSeenAt = now;
  if (b.hits.length >= limit) {
    buckets.set(bucketKey, b);
    return { ok: false, retryMs: Math.max(0, windowMs - (now - (b.hits[0] ?? now))) };
  }
  b.hits.push(now);
  buckets.set(bucketKey, b);
  return { ok: true, retryMs: 0 };
}

export function sharedStoreConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisHit(bucketKey: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryMs: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, "");
  const windowId = Math.floor(Date.now() / windowMs);
  const key = `rl:${bucketKey}:${windowId}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { result?: number }[];
    const count = Number(out?.[0]?.result ?? 0);
    const retryMs = (windowId + 1) * windowMs - Date.now();
    return { ok: count <= limit, retryMs };
  } catch {
    return null; // store down: fall back to memory rather than failing the request
  }
}

function tooMany(retryMs: number) {
  return NextResponse.json(
    { error: "rate_limited", retry_in_ms: retryMs },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(retryMs / 1000))), "Cache-Control": "no-store" } }
  );
}

/**
 * Returns a 429 response when over the limit, else null.
 * `subject` (e.g. a user id) replaces the IP for signed-in routes.
 */
export async function checkRateLimit(
  request: Request | NextRequest,
  key: string,
  limit: number,
  windowMs: number,
  subject?: string
): Promise<NextResponse | null> {
  const bucketKey = `${key}:${subject ? `u:${subject}` : `ip:${clientIp(request)}`}`;
  const r = (sharedStoreConfigured() ? await redisHit(bucketKey, limit, windowMs) : null) ?? memoryHit(bucketKey, limit, windowMs);
  return r.ok ? null : tooMany(r.retryMs);
}

/** Test hook. */
export function _resetMemoryBuckets() {
  buckets.clear();
}
