import { siteUrl } from "@/lib/email/unsubscribe";

function esc(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/** Only https links go into the button; anything else falls back to the site root. */
export function safeHttpsUrl(u: string | null | undefined, fallback: string): string {
  try {
    const url = new URL(String(u || ""));
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function renderDiscountEmail(input: {
  subject: string;
  preheader?: string;
  percent_off: number;
  code: string;
  expires_at?: string;
  cta_url: string;
  unsubscribe_url: string;
}) {
  const percent = Math.max(1, Math.min(99, Math.floor(input.percent_off)));
  const exp = input.expires_at ? `Expires: ${esc(input.expires_at)}` : "";
  const pre = input.preheader ? esc(input.preheader) : "";

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;max-width:640px;margin:0 auto;padding:24px">
    ${pre ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${pre}</div>` : ""}
    <h1 style="margin:0 0 8px">Save ${percent}% on Pro</h1>
    <p style="margin:0 0 16px;color:#444">Use code <b>${esc(input.code)}</b>. ${exp}</p>

    <a href="${esc(safeHttpsUrl(input.cta_url, siteUrl() + "/"))}"
       style="display:inline-block;padding:12px 18px;border-radius:10px;text-decoration:none;background:#111;color:#fff">
      Unlock Pro
    </a>

    <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>

    <p style="margin:0;color:#666;font-size:12px">
      You're receiving this because you opted into promos.
      <a href="${esc(input.unsubscribe_url)}">Unsubscribe</a>
    </p>
  </div>
  `;
  return html;
}
