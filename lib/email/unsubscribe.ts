/** RFC 2369 / RFC 8058 unsubscribe headers and URLs. */
export type UnsubKind = "marketing" | "news" | "alerts";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://surplus-bus.vercel.app").replace(/\/$/, "");
}

export function unsubscribeUrl(token: string, kind: UnsubKind): string {
  return `${siteUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}&kind=${kind}`;
}

export function unsubscribePageUrl(token: string, kind: UnsubKind): string {
  return `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}&kind=${kind}`;
}

export function listUnsubscribeHeaders(token: string, kind: UnsubKind): Record<string, string> {
  const mailto = process.env.EMAIL_UNSUBSCRIBE_MAILTO;
  const parts = [`<${unsubscribeUrl(token, kind)}>`];
  if (mailto) parts.push(`<mailto:${mailto}?subject=unsubscribe>`);
  return {
    "List-Unsubscribe": parts.join(", "),
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
