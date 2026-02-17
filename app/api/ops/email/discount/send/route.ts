import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/auth/requireUser";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { sendEmail } from "@/lib/email/resend";
import { renderDiscountEmail } from "@/lib/email/templates/discountPercent";

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireOperator();
  if (error || !user) return error!;

  const body = await req.json().catch(() => null);
  if (!body) return json(400, { error: "invalid_json" });

  const subject = String(body.subject || "").trim();
  const preheader = String(body.preheader || "").trim();
  const code = String(body.code || "").trim();
  const percent_off = Number(body.percent_off);
  const expires_at = body.expires_at ? String(body.expires_at) : null;
  const cta_url = String(body.cta_url || "").trim();

  if (!subject || !code || !cta_url || !Number.isFinite(percent_off)) {
    return json(400, { error: "missing_fields" });
  }

  const admin = createServiceRoleClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://surplus-bus.vercel.app";

  // Rate limit: block if campaign created in last 30 seconds
  const { data: last } = await admin
    .from("email_campaigns")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.created_at) {
    const delta = Date.now() - new Date(last.created_at).getTime();
    if (delta < 30_000) return json(429, { error: "rate_limited", retry_in_ms: 30_000 - delta });
  }

  // Create campaign row
  const payload = { code, percent_off, expires_at, cta_url };
  const { data: campaign, error: cErr } = await admin
    .from("email_campaigns")
    .insert({
      created_by: user.id,
      kind: "discount",
      subject,
      preheader: preheader || null,
      payload,
      status: "sending",
    })
    .select("id")
    .single();

  if (cErr || !campaign) return json(500, { error: "campaign_create_failed", details: cErr?.message });

  // Recipients: marketing_opt_in=true, with email and unsub_token
  const { data: prefRows, error: rErr } = await admin
    .from("user_preferences")
    .select("profile_id, unsub_token")
    .eq("marketing_opt_in", true);

  if (rErr) return json(500, { error: "recipient_query_failed", details: rErr.message });

  const profileIds = (prefRows || []).filter((r) => r.unsub_token).map((r) => r.profile_id);
  if (profileIds.length === 0) {
    await admin.from("email_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaign.id);
    return json(200, { ok: true, campaign_id: campaign.id, recipients: 0, sent: 0, failed: 0 });
  }

  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", profileIds);

  const emailMap = new Map<string, string>();
  (profileRows || []).forEach((p) => {
    if (p.email) emailMap.set(p.id, p.email);
  });

  const recipients = (prefRows || [])
    .filter((r) => r.unsub_token && emailMap.has(r.profile_id))
    .map((r) => ({
      profile_id: r.profile_id,
      email: emailMap.get(r.profile_id)!,
      unsub_token: r.unsub_token,
    }));

  let sent = 0;
  let failed = 0;

  for (const rec of recipients) {
    const unsubscribe_url = `${appUrl}/api/unsubscribe?token=${encodeURIComponent(rec.unsub_token)}&kind=marketing`;
    const html = renderDiscountEmail({
      subject,
      preheader,
      percent_off,
      code,
      expires_at: expires_at || undefined,
      cta_url,
      unsubscribe_url,
    });

    try {
      const { data: sendRow } = await admin
        .from("email_campaign_sends")
        .insert({
          campaign_id: campaign.id,
          profile_id: rec.profile_id,
          email: rec.email,
          status: "queued",
        })
        .select("id")
        .single();

      const headers = {
        "List-Unsubscribe": `<${unsubscribe_url}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      };

      const resp = await sendEmail({ to: rec.email, subject, html, headers });

      await admin
        .from("email_campaign_sends")
        .update({
          status: "sent",
          provider_id: resp?.id ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", sendRow?.id);

      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown_error";
      await admin.from("email_campaign_sends").insert({
        campaign_id: campaign.id,
        profile_id: rec.profile_id,
        email: rec.email,
        status: "failed",
        error_message: msg,
      });
      failed++;
    }
  }

  await admin
    .from("email_campaigns")
    .update({
      status: failed > 0 ? "failed" : "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  return json(200, { ok: true, campaign_id: campaign.id, recipients: recipients.length, sent, failed });
}
