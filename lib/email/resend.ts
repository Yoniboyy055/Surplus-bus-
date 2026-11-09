/**
 * Resend transactional email. Email headers (List-Unsubscribe etc.) go in the
 * JSON body's `headers` field so they reach the recipient's mail client; they
 * are NOT HTTP request headers to the Resend API.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!from) throw new Error("Missing EMAIL_FROM");

  const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(params.headers && Object.keys(params.headers).length ? { headers: params.headers } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend error: ${res.status} ${JSON.stringify(data)}`);
  }
  return data; // includes id
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** CASL sender identification footer. BUSINESS_MAILING_ADDRESS must be set before sending. */
export function senderFooterHtml(unsubscribeUrl?: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://surplus-bus.vercel.app";
  const addr = process.env.BUSINESS_MAILING_ADDRESS || "";
  return `<hr/><p style="font-size:12px;color:#5b4a3c">Surplus Bus is a service of YK+ Systems${addr ? ` · ${escapeHtml(addr)}` : ""}.<br/>
  Contact: ${escapeHtml(process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || "")} · Privacy: ${site}/legal/privacy${
    unsubscribeUrl ? `<br/><a href="${unsubscribeUrl}">Unsubscribe</a> (one click, takes effect immediately)` : ""
  }</p>`;
}

export function caslSenderConfigured(): boolean {
  return Boolean(process.env.BUSINESS_MAILING_ADDRESS && process.env.EMAIL_FROM);
}
