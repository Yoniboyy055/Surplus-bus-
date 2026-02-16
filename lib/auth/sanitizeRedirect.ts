/**
 * Allowed path prefixes for post-login redirects.
 * Prevents open-redirect: only relative paths within the app are allowed.
 */
const ALLOWED_PREFIXES = [
  "/dashboard",
  "/ops",
  "/alerts",
  "/feed",
  "/opportunities",
  "/saved",
  "/inbox",
  "/news",
  "/analytics",
  "/settings",
  "/onboarding",
];

const DEFAULT_REDIRECT = "/dashboard";

/**
 * Sanitizes a redirect path to prevent open-redirect attacks.
 * - Allows only relative paths starting with /
 * - Denies absolute URLs (://, //)
 * - Denies path traversal (..)
 * - Allowlist: must match one of ALLOWED_PREFIXES
 */
export function sanitizeRedirectPath(input: string | null | undefined): string {
  if (!input || typeof input !== "string") return DEFAULT_REDIRECT;

  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_REDIRECT;

  // Reject absolute URLs and protocol-relative
  if (trimmed.includes("://") || trimmed.startsWith("//")) {
    return DEFAULT_REDIRECT;
  }

  // Must start with /
  if (!trimmed.startsWith("/")) return DEFAULT_REDIRECT;

  // Reject path traversal
  if (trimmed.includes("..")) return DEFAULT_REDIRECT;

  // Strip query/hash for prefix check
  const pathOnly = (trimmed.split("?")[0] ?? "").split("#")[0] ?? "";

  // Must match an allowed prefix
  const allowed = ALLOWED_PREFIXES.some((prefix) =>
    pathOnly === prefix || pathOnly.startsWith(prefix + "/")
  );
  if (!allowed) return DEFAULT_REDIRECT;

  return trimmed;
}
