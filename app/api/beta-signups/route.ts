import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { caslSenderConfigured, escapeHtml, sendEmail, senderFooterHtml } from "@/lib/email/resend";
import { siteUrl } from "@/lib/email/unsubscribe";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { WAITLIST_CONSENT_FALLBACK, WAITLIST_CONSENT_TEXTS, waitlistSignup } from "@/lib/account/schemas";
import { track } from "@/lib/analytics/track";

export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, "beta-signups", 8, 60_000);
  if (limited) return limited;

  const raw = await request.json().catch(() => null);
  if (!raw) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  if (raw.marketing_consent !== true) {
    return NextResponse.json({ error: "Tick the consent box to join the waitlist." }, { status: 400 });
  }
  const parsed = waitlistSignup.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
  const { email, use_case, consent_text, utm_source } = parsed.data;

  // Store only wording we actually show; anything else is recorded as the canonical fallback.
  const knownText = (WAITLIST_CONSENT_TEXTS as readonly string[]).includes(consent_text ?? "");
  const storedConsent = knownText ? consent_text! : WAITLIST_CONSENT_FALLBACK;

  // Server-only write: beta_signups has RLS on and no client grants (migrations 051 + 054).
  let supabase: ReturnType<typeof createServiceRoleClient> | null = null;
  try {
    supabase = createServiceRoleClient();
  } catch {
    supabase = null;
  }
  if (!supabase) {
    console.error("[Beta] Storage not configured; refusing signup without an auditable consent record.");
    return NextResponse.json({ error: "Signups are temporarily unavailable. Please try again later." }, { status: 503 });
  }
  const { error } = await supabase.from("beta_signups").upsert(
    {
      email,
      use_case: use_case || null,
      marketing_consent: true,
      consent_text: storedConsent,
      consent_at: new Date().toISOString(),
      consent_source: knownText ? "waitlist_form" : "api",
    },
    { onConflict: "email" }
  );
  if (error) {
    // Fail closed: never store an email without its consent record.
    console.error("[Beta] Supabase upsert failed:", error.message);
    return NextResponse.json({ error: "Signups are temporarily unavailable. Please try again later." }, { status: 503 });
  }
  await track("waitlist_joined", { consent_version: knownText ? "v1" : "fallback", has_utm: Boolean(utm_source) }, { db: supabase });

  if (!process.env.RESEND_API_KEY || !caslSenderConfigured()) {
    console.warn("[Beta] Email or CASL sender details not configured — signup saved to DB only.");
    return NextResponse.json({ ok: true, email_sent: false });
  }

  let adminSent = false;
  let userSent = false;
  const emailTo = process.env.EMAIL_TO;
  const site = siteUrl();

  if (emailTo) {
    try {
      await sendEmail({
        to: emailTo,
        subject: "New Surplus Bus waitlist signup",
        html: `
          <h2>New Surplus Bus Beta Signup</h2>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Use case:</strong> ${escapeHtml(use_case || "not specified")}</p>
          <p><strong>Consent:</strong> recorded (${knownText ? "form wording" : "fallback wording"})</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        `,
      });
      adminSent = true;
    } catch (err) {
      console.error("[Beta] Admin notification failed:", err instanceof Error ? err.message : err);
    }
  }

  try {
    await sendEmail({
      to: email,
      subject: "You're on the Surplus Bus waitlist",
      html: `
        <p>Hi,</p>
        <p>You're on the Surplus Bus waitlist.</p>
        <p>Surplus Bus is an information service from YK+ Systems. It shows what Canadian government surplus has sold for, from public open data, and links you to the official site. We don't bid, broker, match buyers and sellers, or take a fee on transactions.</p>
        <p><strong>What happens next</strong></p>
        <ul>
          <li>We'll email this address when a beta spot opens.</li>
          <li>Pricing: ${site}/pricing</li>
        </ul>
        <p>Didn't sign up? Ignore this email and you won't hear from us again. To stop future emails at any time, reply with "unsubscribe".</p>
        ${senderFooterHtml()}
      `,
    });
    userSent = true;
  } catch (err) {
    console.error("[Beta] User confirmation failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true, admin_notified: adminSent, user_confirmed: userSent });
}
