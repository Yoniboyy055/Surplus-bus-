import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { requireOperator } from "@/lib/auth/requireUser";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

/**
 * DB connectivity probe.
 * GET /api/ops/db-probe
 * Auth: Authorization: Bearer CRON_SECRET OR authenticated operator
 *
 * Returns: supabaseUrlHost, canSelectSources, canInsertSourceRecords,
 * sourceRecordsCount, projectFingerprint.
 */
export async function GET(request: NextRequest) {
  const cronOk = verifyCronSecret(request);
  if (!cronOk) {
    const { error } = await requireOperator();
    if (error) return error;
  }


  let supabaseUrlHost = "";
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) supabaseUrlHost = new URL(url).hostname;
  } catch {
    supabaseUrlHost = "[parse-error]";
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        supabaseUrlHost,
        canSelectSources: false,
        canInsertSourceRecords: false,
        sourceRecordsCount: null,
        projectFingerprint: null,
        clientError: msg,
      },
      { status: 500 }
    );
  }

  let canSelectSources = false;
  let sourceRecordsCount: number | null = null;
  let canInsertSourceRecords = false;
  let insertError: string | null = null;
  let projectFingerprint: Record<string, unknown> | null = null;

  const { count: sourcesCount, error: sourcesErr } = await supabase
    .from("sources")
    .select("*", { count: "exact", head: true });
  canSelectSources = !sourcesErr;

  const { count: srCount, error: srCountErr } = await supabase
    .from("source_records")
    .select("*", { count: "exact", head: true });
  sourceRecordsCount = srCountErr ? null : srCount;

  const { data: firstSource } = await supabase.from("sources").select("id").limit(1).maybeSingle();
  let runId: string | null = null;
  if (firstSource?.id) {
    const { data: lastRun } = await supabase
      .from("source_runs")
      .select("id")
      .eq("source_id", firstSource.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    runId = lastRun?.id ?? null;
  }

  if (!runId && firstSource?.id) {
    const { data: newRun } = await supabase
      .from("source_runs")
      .insert({
        source_id: firstSource.id,
        agent_name: "db_probe",
        status: "running",
      })
      .select("id")
      .single();
    runId = newRun?.id ?? null;
  }

  const probeExtId = `db_probe_${Date.now()}`;
  if (firstSource?.id && runId) {
    const { error: insertErr } = await supabase.from("source_records").insert({
      source_id: firstSource.id,
      source_run_id: runId,
      external_id: probeExtId,
      source_url: "https://example.com/db-probe",
      source_url_normalized: "https://example.com/db-probe",
      source_url_hash: `probe_${Date.now()}`,
      raw_payload: {},
      payload_hash: "dbprobe",
    });
    canInsertSourceRecords = !insertErr;
    if (insertErr) insertError = insertErr.message;

    if (canInsertSourceRecords) {
      await supabase.from("source_records").delete().eq("external_id", probeExtId);
    }
  } else {
    insertError = "No source_id or run_id available";
  }

  const { data: fp } = await supabase.rpc("get_project_fingerprint");
  projectFingerprint = fp as Record<string, unknown> | null;

  return NextResponse.json({
    supabaseUrlHost,
    canSelectSources,
    canInsertSourceRecords,
    sourceRecordsCount,
    projectFingerprint,
    ...(insertError && { insertError }),
  });
}

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const provided = authHeader.slice(7);
  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(cronSecret, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
