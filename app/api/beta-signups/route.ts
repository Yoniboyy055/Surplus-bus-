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

  // 1) Persist to Supabase (best-effort — signup is saved even if email fails)
  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase
      .from("beta_signups")
      .upsert({ email, use_case: use_case ?? null }, { onConflict: "email" });
    if (error) {
      console.error("[Beta] Supabase upsert failed:", error.message);
    }
  }

  // 2) Send lead notification to EMAIL_TO via Resend
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const emailTo = process.env.EMAIL_TO;

  if (!resendKey || !emailFrom) {
    console.error("[Beta] RESEND_API_KEY or EMAIL_FROM is missing. Cannot send email.");
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 500 },
    );
  }

  try {
    // Lead notification → your inbox
    if (emailTo) {
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
    }

    // Confirmation → the user
    await sendEmail({
      to: email,
      subject: "Welcome to Surplus Bus Beta",
      html: `
        <h2>You\u2019re on the list!</h2>
        <p>Thanks for signing up for the Surplus Bus beta. We\u2019ll send your first weekly intelligence brief soon.</p>
        <p>\u2014 The Surplus Bus Team</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Beta] Email send failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
