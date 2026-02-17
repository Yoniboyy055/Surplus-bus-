import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

export async function POST(request: Request) {
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

  // 1) Persist to Supabase (best-effort)
  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase
      .from("beta_signups")
      .upsert({ email, use_case: use_case ?? null }, { onConflict: "email" });
    if (error) {
      console.error("[Beta] Supabase upsert failed:", error.message);
    }
  }

  // 2) Send notification email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const adminEmail = process.env.OWNER_EMAIL;

  if (!resendKey || !emailFrom) {
    console.warn("[Beta] Email service not configured (RESEND_API_KEY / EMAIL_FROM missing). Signup saved but no email sent.");
    return NextResponse.json({ ok: true, email_sent: false, reason: "email_not_configured" });
  }

  try {
    // Notify admin of new signup
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `New beta signup: ${email}`,
        html: `
          <h2>New Surplus Bus Beta Signup</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Use case:</strong> ${use_case ?? "not specified"}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        `,
      });
    }

    // Confirmation to the user
    await sendEmail({
      to: email,
      subject: "Welcome to Surplus Bus Beta",
      html: `
        <h2>You're on the list!</h2>
        <p>Thanks for signing up for the Surplus Bus beta. We'll send your first weekly intelligence brief soon.</p>
        <p>— The Surplus Bus Team</p>
      `,
    });

    return NextResponse.json({ ok: true, email_sent: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Beta] Email send failed:", msg);
    return NextResponse.json({ ok: true, email_sent: false, reason: msg });
  }
}
