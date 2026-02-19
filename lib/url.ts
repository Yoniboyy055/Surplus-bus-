/**
 * Returns true if the URL is an absolute HTTP(S) URL suitable for
 * opening in a new tab. Returns false for relative paths, javascript:,
 * data:, or malformed strings.
 */
export function isExternalHttpUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Attempts to turn a raw source_url into a usable external link.
 * - Trims whitespace
 * - Prefixes https:// when the string looks like a domain but lacks protocol
 * - Returns null if the result is not a valid HTTP URL
 */
export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let url = raw.trim();
  if (!url) return null;

  if (url.startsWith("//")) {
    url = "https:" + url;
  } else if (!url.includes("://")) {
    if (/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}/i.test(url)) {
      url = "https://" + url;
    } else if (url.startsWith("/")) {
      return null;
    }
  }

  return isExternalHttpUrl(url) ? url : null;
}
