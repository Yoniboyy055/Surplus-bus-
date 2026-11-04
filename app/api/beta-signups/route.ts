import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { checkRateLimit } from "@/lib/security/rateLimit";

const CONSENT_FALLBACK =
  "Yes, YK+ Systems may email me when Surplus Bus beta access opens, plus occasional Surplus Bus product updates. I can unsubscribe anytime.";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "beta-signups", 8, 60_000);
  if (limited) return limited;

  let body: {
    email?: string;
    use_case?: string;
    marketing_consent?: boolean;
    consent_text?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, use_case, marketing_consent, consent_text } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
  }

  if (!marketing_consent) {
    return NextResponse.json(
      { error: "Tick the consent box to join the waitlist." },
      { status: 400 }
    );
  }

  const supabase = createClient();
  if (!supabase) {
    console.error("[Beta] Storage not configured; refusing signup without an auditable consent record.");
    return NextResponse.json({ error: "Signups are temporarily unavailable. Please try again later." }, { status: 503 });
  }
  const { error } = await supabase.from("beta_signups").upsert(
    {
      email,
      use_case: use_case ?? null,
      marketing_consent: true,
      consent_text: consent_text || CONSENT_FALLBACK,
      consent_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
  if (error) {
    // Fail closed: never store an email without its consent record.
    console.error("[Beta] Supabase upsert failed:", error.message);
    return NextResponse.json({ error: "Signups are temporarily unavailable. Please try again later." }, { status: 503 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const emailTo = process.env.EMAIL_TO;

  if (!resendKey || !emailFrom) {
    console.warn("[Beta] Email not configured — signup saved to DB only.");
    return NextResponse.json({ ok: true, email_sent: false });
  }

  let adminSent = false;
  let userSent = false;

  if (emailTo) {
    try {
      await sendEmail({
        to: emailTo,
        subject: `New beta signup: ${email}`,
        html: `
          <h2>New Surplus Bus Beta Signup</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Use case:</strong> ${use_case ?? "not specified"}</p>
          <p><strong>Consent:</strong> recorded</p>
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
        <p>Surplus Bus is an information service from YK+ Systems. We organise public Canadian government surplus and related listings and point you to the official source. We don't bid, broker, match buyers and sellers, or take a fee on transactions.</p>
        <p><strong>What happens next</strong></p>
        <ul>
          <li>We'll email this address when a beta spot opens.</li>
          <li>Product overview: https://surplus-bus.vercel.app/product</li>
          <li>Pricing: https://surplus-bus.vercel.app/pricing</li>
        </ul>
        <p>You won't get match alerts by email in this phase. After you have access, new matches show in your in-app inbox.</p>
        <p>Didn't sign up? Ignore this email and you won't hear from us again. To stop future emails at any time, reply to this email with \"unsubscribe\".</p>
        <p>— Surplus Bus / YK+ Systems</p>
        <hr />
        <p style="font-size:12px;color:#666">YK+ Systems · Ontario, Canada<br/>
        Privacy: https://surplus-bus.vercel.app/legal/privacy<br/>
        Anti-spam: https://surplus-bus.vercel.app/legal/anti-spam</p>
      `,
    });
    userSent = true;
  } catch (err) {
    console.error("[Beta] User confirmation failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true, admin_notified: adminSent, user_confirmed: userSent });
}
