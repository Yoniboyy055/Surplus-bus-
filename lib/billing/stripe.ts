/**
 * Minimal Stripe REST client (no SDK dependency) + webhook signature check.
 * Env: STRIPE_SECRET_KEY (sk_test_… until Yonatan approves live),
 *      STRIPE_WEBHOOK_SECRET (whsec_…), STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_ANNUAL.
 */
import { createHmac, timingSafeEqual } from "crypto";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeMode(): "test" | "live" | "off" {
  const k = process.env.STRIPE_SECRET_KEY || "";
  return k.startsWith("sk_live_") ? "live" : k.startsWith("sk_test_") ? "test" : "off";
}

function form(obj: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v != null && v !== "") u.append(k, String(v));
  return u.toString();
}

export async function stripePost<T = any>(path: string, params: Record<string, string | number | undefined | null>): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  const res = await fetch(`${process.env.STRIPE_API_BASE || "https://api.stripe.com"}/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${path} ${res.status}: ${body?.error?.message || "error"}`);
  return body as T;
}

/**
 * Verify a Stripe-Signature header (t=…,v1=…) over the raw body.
 * Rejects events older than toleranceSec (replay protection).
 */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    })
  ) as Record<string, string>;
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const sigs = header
    .split(",")
    .filter((kv) => kv.trim().startsWith("v1="))
    .map((kv) => kv.trim().slice(3));
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

export function signStripePayload(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)): string {
  const sig = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${sig}`;
}
