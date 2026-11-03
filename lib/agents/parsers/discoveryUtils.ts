/**
 * Shared utilities previously used by discovery-role city parsers.
 * Lot scraping of third-party auction hosts is disabled (YkData ToS audit).
 * Kept for future recon tooling that only records an official URL.
 */

const VENDOR_PATTERNS = [
  /govdeals\.com/i,
  /publicsurplus\.com/i,
  /municibid\.com/i,
  /publicsurplusauctions\.com/i,
  /gcsurplus\.ca/i,
  /maauctions\.com/i,
] as const;

/**
 * Scan HTML anchor hrefs for known third-party auction vendor domains.
 * Returns the first matching absolute URL, or null if none found.
 * Callers must treat the result as a link-out target only — never scrape lots.
 */
export function extractVendorLink(html: string): string | null {
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    if (!href) continue;
    for (const pattern of VENDOR_PATTERNS) {
      if (pattern.test(href) && /^https?:\/\//i.test(href)) return href;
    }
  }
  return null;
}
