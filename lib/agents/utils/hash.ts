import crypto from "crypto";

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function normalizeUrl(url: string) {
  return url.trim().replace(/\/$/, "").toLowerCase();
}

/** Canonical JSON stringify for stable hashing (sorted keys, no updated_at). */
export function canonicalJsonStringify(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of sorted) {
    ordered[k] = obj[k];
  }
  return JSON.stringify(ordered);
}
