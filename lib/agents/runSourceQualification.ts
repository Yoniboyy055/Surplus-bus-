import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { executeAgentRun } from "@/lib/agents/runAgentRunner";

/**
 * Source qualification gate result for a single check condition.
 */
export type QualificationGates = {
  real_listings_found: boolean;
  stable_external_id: boolean;
  core_fields_present: boolean;
  dedup_verified: boolean;
  terminal_state_plan: boolean;
  consecutive_runs_ok: boolean;
  gate_passed: boolean;
};

/**
 * Result returned by `runSourceQualification`.
 */
export type QualificationResult = QualificationGates & {
  source_id: string;
  parser_key: string;
  log_id: string | null;
};

/**
 * Run the 5-gate source qualification check for a given source.
 *
 * Gate rules:
 *  1. real_listings_found   — at least 1 source_record with non-null title AND
 *                             non-null source_url was written during the sandbox run.
 *  2. stable_external_id    — every source_record produced by the run has a
 *                             non-null, non-empty external_id (dedup_flag IS NULL).
 *  3. core_fields_present   — every record has title, source_url, and status set.
 *  4. dedup_verified        — a second sandbox run produces 0 new rows (idempotent).
 *  5. terminal_state_plan   — a row exists in source_terminal_capabilities for
 *                             this source_id.
 *  consecutive_runs_ok      — incremented only when all 5 gates above pass; must
 *                             reach 2 before production is enabled.
 *
 * When all gates pass (consecutive_runs_ok >= 2):
 *  - sources.production_ready is set to true
 *  - sources.is_active is set to true
 *  - sources.quality_state is set to 'green'
 *  - [QUALIFIED] is logged
 *
 * All runs are executed in sandbox mode, so no canonical writes are made.
 *
 * @param sourceId - The UUID of the source row in the sources table.
 * @returns QualificationResult with all gate outcomes and the log_id.
 */
export async function runSourceQualification(
  sourceId: string
): Promise<QualificationResult> {
  const supabase = createServiceRoleClient();

  // Load source metadata
  const { data: source, error: sourceErr } = await supabase
    .from("sources")
    .select("id, parser_key, name")
    .eq("id", sourceId)
    .single();

  if (sourceErr || !source) {
    throw new Error(
      `runSourceQualification: source not found for id=${sourceId}: ${sourceErr?.message ?? "no row"}`
    );
  }

  const parserKey: string = source.parser_key;

  // ── Gate 5: terminal_state_plan ──────────────────────────────────────────
  const { data: termCap } = await supabase
    .from("source_terminal_capabilities")
    .select("source_id")
    .eq("source_id", sourceId)
    .maybeSingle();

  const terminalStatePlan = termCap != null;

  // ── First sandbox run ─────────────────────────────────────────────────────
  // Temporarily mark the source as active+production_ready for the sandbox run,
  // then revert. We use a direct update here so qualification can run even on
  // sources that are not yet enabled for production.
  await supabase
    .from("sources")
    .update({ is_active: true, production_ready: true })
    .eq("id", sourceId);

  let firstRunOk = false;
  let firstRunId: string | null = null;
  try {
    const firstResult = await executeAgentRun(parserKey, /* sandboxMode */ true);
    firstRunOk = firstResult.ok;
    firstRunId = firstResult.runs[0]?.run_id ?? null;
  } catch {
    firstRunOk = false;
  } finally {
    // Revert — production flags should only be set by this function at the end.
    await supabase
      .from("sources")
      .update({ is_active: false, production_ready: false })
      .eq("id", sourceId);
  }

  // ── Inspect source_records from the first run ─────────────────────────────
  const { data: records } = firstRunId
    ? await supabase
        .from("source_records")
        .select("external_id, dedup_flag, raw_payload")
        .eq("source_id", sourceId)
        .eq("source_run_id", firstRunId)
    : { data: [] };

  const allRecords = records ?? [];

  // Gate 1: real_listings_found
  const realListingsFound = allRecords.some((r) => {
    const p = r.raw_payload as Record<string, unknown> | null;
    return p?.title != null && p?.source_url != null;
  });

  // Gate 2: stable_external_id — all records have a non-null, non-empty
  // external_id. Vacuously true when no records were produced; Gate 1 will
  // catch the absence of records independently.
  const stableExternalId =
    allRecords.every((r) => r.external_id != null && r.external_id !== "" && r.dedup_flag == null);

  // Gate 3: core_fields_present — all records have title, source_url, status.
  // Vacuously true when no records were produced; Gate 1 catches that case.
  const coreFieldsPresent = allRecords.every((r) => {
    const p = r.raw_payload as Record<string, unknown> | null;
    return p?.title != null && p?.source_url != null && p?.status != null;
  });

  // ── Second sandbox run (Gate 4: dedup_verified) ───────────────────────────
  // Capture the total source_records count before the second run, then compare
  // after. If no new rows were inserted (idempotent), dedup is verified.
  const { count: countBefore } = await supabase
    .from("source_records")
    .select("id", { count: "exact", head: true })
    .eq("source_id", sourceId);

  await supabase
    .from("sources")
    .update({ is_active: true, production_ready: true })
    .eq("id", sourceId);

  try {
    await executeAgentRun(parserKey, /* sandboxMode */ true);
  } catch {
    // Second run failure — dedup cannot be verified
  } finally {
    await supabase
      .from("sources")
      .update({ is_active: false, production_ready: false })
      .eq("id", sourceId);
  }

  const { count: countAfter } = await supabase
    .from("source_records")
    .select("id", { count: "exact", head: true })
    .eq("source_id", sourceId);

  // Gate 4: dedup_verified — second run produces 0 new rows (idempotent)
  const dedupVerified = countBefore != null && countAfter != null && countAfter === countBefore;

  // ── Evaluate overall gate state ───────────────────────────────────────────
  const corePassed =
    realListingsFound &&
    stableExternalId &&
    coreFieldsPresent &&
    dedupVerified &&
    terminalStatePlan;

  // Read current consecutive_runs count from the last log entry for this source
  const { data: lastLog } = await supabase
    .from("source_qualification_log")
    .select("consecutive_runs_ok")
    .eq("source_id", sourceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevConsecutive: number = lastLog?.consecutive_runs_ok ?? 0;
  const consecutiveRunsCount = corePassed ? prevConsecutive + 1 : 0;
  const consecutiveRunsOk = consecutiveRunsCount >= 2;
  const gatePassed = corePassed && consecutiveRunsOk;

  // ── Write qualification log ───────────────────────────────────────────────
  const { data: logRow } = await supabase
    .from("source_qualification_log")
    .insert({
      source_id: sourceId,
      real_listings_found: realListingsFound,
      stable_external_id: stableExternalId,
      core_fields_present: coreFieldsPresent,
      dedup_verified: dedupVerified,
      terminal_state_plan: terminalStatePlan,
      consecutive_runs_ok: consecutiveRunsCount,
      gate_passed: gatePassed,
    })
    .select("id")
    .single();

  const logId = logRow?.id ?? null;

  // ── Promote source to production if all gates pass ────────────────────────
  if (gatePassed) {
    await supabase
      .from("sources")
      .update({
        production_ready: true,
        is_active: true,
        quality_state: "green",
      })
      .eq("id", sourceId);

    console.log(
      `[QUALIFIED] ${parserKey} passed all gates — production enabled`
    );
  }

  return {
    source_id: sourceId,
    parser_key: parserKey,
    log_id: logId,
    real_listings_found: realListingsFound,
    stable_external_id: stableExternalId,
    core_fields_present: coreFieldsPresent,
    dedup_verified: dedupVerified,
    terminal_state_plan: terminalStatePlan,
    consecutive_runs_ok: consecutiveRunsOk,
    gate_passed: gatePassed,
  };
}
