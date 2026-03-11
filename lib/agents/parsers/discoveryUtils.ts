/**
 * Shared utilities for discovery-role (recon) city parsers.
 */

/**
 * Known third-party auction vendor domains. Discovery-role city parsers scan
 * outbound links for these patterns to find the real auction host.
 */
const VENDOR_PATTERNS = [
  /govdeals\.com/i,
  /publicsurplus\.com/i,
  /municibid\.com/i,
  /publicsurplusauctions\.com/i,
  /gcsurplus\.ca/i,
] as const;

/**
 * Scan HTML anchor hrefs for known third-party auction vendor domains.
 * Returns the first matching absolute URL, or null if none found.
 */
export function extractVendorLink(html: string): string | null {
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    if (!href) continue;
    for (const pattern of VENDOR_PATTERNS) {
      if (pattern.test(href)) {
        // Only return absolute URLs; skip relative paths
        if (/^https?:\/\//i.test(href)) return href;
      }
    }
  }
  return null;
}
