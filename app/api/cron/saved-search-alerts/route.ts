import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security/cronAuth";
import { runSavedSearchAlerts } from "@/lib/alerts/savedSearchAlerts";
import { sendEmail, escapeHtml, senderFooterHtml, caslSenderConfigured } from "@/lib/email/resend";
import { listUnsubscribeHeaders, unsubscribeUrl, siteUrl } from "@/lib/email/unsubscribe";
import { logApiStart, logApiEnd } from "@/lib/observability";

/**
 * Daily saved-search alerts (after the open-data ingest).
 * Writes in-app inbox items; emails only users with a recorded consent, and
 * only when RESEND_API_KEY, EMAIL_FROM and BUSINESS_MAILING_ADDRESS (CASL) are set.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return new Response("Unauthorized", { status: 401 });
  const { requestId, start } = logApiStart("/api/cron/saved-search-alerts", null, {});
  let db;
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/serviceRole");
    db = createServiceRoleClient();
  } catch {
    logApiEnd("/api/cron/saved-search-alerts", requestId, start, 500);
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }
  const canEmail = Boolean(process.env.RESEND_API_KEY) && caslSenderConfigured();
  const summary = await runSavedSearchAlerts({
    db,
    canEmail,
    send: canEmail ? (m) => sendEmail(m) : null,
    buildEmail: ({ token, search, items }) => {
      const name = search.name || search.query;
      const unsub = unsubscribeUrl(token, "alerts");
      const list = items
        .slice(0, 10)
        .map((i) => `<li>${escapeHtml(i.title)}${i.body ? ` <span style="color:#5b4a3c">${escapeHtml(i.body)}</span>` : ""}</li>`)
        .join("");
      return {
        subject: `${items.length} new match${items.length === 1 ? "" : "es"} for “${name}”`,
        html: `<p>New public-surplus matches for your saved search <strong>${escapeHtml(name)}</strong>:</p><ul>${list}</ul>
          <p><a href="${siteUrl()}/inbox">Open your inbox</a> for links to the official sources.</p>${senderFooterHtml(unsub)}`,
        text: `New matches for "${name}":\n${items.slice(0, 10).map((i) => `- ${i.title}`).join("\n")}\n\nInbox: ${siteUrl()}/inbox\nUnsubscribe: ${unsub}`,
        headers: listUnsubscribeHeaders(token, "alerts"),
      };
    },
  });
  const status = summary.errors.length ? 207 : 200;
  logApiEnd("/api/cron/saved-search-alerts", requestId, start, status);
  return NextResponse.json({ ok: summary.errors.length === 0, email_enabled: canEmail, ...summary }, { status });
}
