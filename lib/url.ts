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
