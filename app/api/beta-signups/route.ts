import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "beta-signups", 8, 60_000);
  if (limited) return limited;

  let body: { email?: string; use_case?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, use_case } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase
      .from("beta_signups")
      .upsert({ email, use_case: use_case ?? null }, { onConflict: "email" });
    if (error) {
      console.error("[Beta] Supabase upsert failed:", error.message);
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const emailTo = process.env.EMAIL_TO;

  if (!resendKey || !emailFrom) {
    console.error("[Beta] RESEND_API_KEY or EMAIL_FROM is missing. Cannot send email.");
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
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
      subject: "Welcome to Surplus Bus Beta",
      html: `
        <h2>You’re on the list!</h2>
        <p>Thanks for signing up for the Surplus Bus beta. We’ll send your first weekly intelligence brief soon.</p>
        <p>— The Surplus Bus Team</p>
      `,
    });
    userSent = true;
  } catch (err) {
    console.error("[Beta] User confirmation failed (domain not verified?):", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true, admin_notified: adminSent, user_confirmed: userSent });
}
