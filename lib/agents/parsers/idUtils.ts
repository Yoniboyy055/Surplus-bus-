import { createHash } from "crypto";

/**
 * Stable external_id from canonical listing URL.
 * Use when the page has item URLs.
 */
export function stableExternalIdFromUrl(url: string): string {
  const normalized = url.trim().toLowerCase().replace(/\/$/, "");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/**
 * Stable external_id from tuple (title, lot?, link).
 * Use for directory pages with no item URLs.
 */
export function stableExternalIdFromTuple(parts: string[]): string {
  const normalized = parts
    .filter(Boolean)
    .map((p) => p.trim().toLowerCase())
    .join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}
