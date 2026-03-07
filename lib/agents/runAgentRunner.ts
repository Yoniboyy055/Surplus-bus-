import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { runParser } from "@/lib/agents/parsers";
import { sha256, normalizeUrl, canonicalJsonStringify } from "@/lib/agents/utils/hash";
import { buildStablePayloadForHash } from "@/lib/agents/utils/buildStablePayloadForHash";
import { classifyError } from "@/lib/agents/utils/classifyError";
import { computeOpportunityIntelligence } from "@/lib/intelligence/computeOpportunityIntelligence";
import type { ParsedOpportunity } from "@/lib/agents/parsers/types";

export class AgentRunError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "AgentRunError";
  }
}

export type RunResult = {
  ok: boolean;
  parser_key: string;
  runs: Array<{
    source_id: string;
    run_id: string;
    status: string;
    items_found: number;
    items_upserted: number;
    error_message?: string;
    duration_ms?: number;
  }>;
  total_duration_ms?: number;
  message?: string;
};

const STALE_DAYS = 7;

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname.slice(0, 8)}***${u.hostname.slice(-4)}${u.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}

export async function executeAgentRun(parserKey: string): Promise<RunResult> {
  const totalStart = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("[runAgentRunner] supabaseUrl:", maskUrl(supabaseUrl ?? ""), "| serviceRoleKey present:", hasServiceRoleKey);

  const supabase = createServiceRoleClient();

  try {
    const { data: lockAcquired } = await supabase.rpc("acquire_parser_lock", {
      p_parser_key: parserKey,
    });

    if (!lockAcquired) {
      throw new AgentRunError("parser_already_running", 409, "parser_locked");
    }

    const { data: allSources, error: sourcesError } = await supabase
      .from("sources")
      .select("id, name, base_url, feed_url, parser_key, is_active")
      .eq("parser_key", parserKey)
      .order("priority", { ascending: true });

    if (sourcesError) {
      throw new Error(`Failed to load sources: ${sourcesError.message}`);
    }

    if (!allSources?.length) {
      throw new AgentRunError("unknown_parser_key", 404, "unknown_parser_key");
    }

    const sources = allSources.filter((s) => s.is_active);
    if (sources.length === 0) {
      throw new AgentRunError("source_inactive", 409, "source_inactive");
    }

    const runs: RunResult["runs"] = [];

    for (const source of sources) {
      const runStart = Date.now();
      const { data: runRow, error: insertErr } = await supabase
        .from("source_runs")
        .insert({
          source_id: source.id,
          agent_name: `agent_${source.parser_key}`,
          status: "running",
        })
        .select("id")
        .single();

      if (insertErr || !runRow) {
        const errMsg = insertErr?.message ?? "Failed to create run";
        const { data: failRow } = await supabase
          .from("source_runs")
          .insert({
            source_id: source.id,
            agent_name: `agent_${source.parser_key}`,
            status: "failure",
            completed_at: new Date().toISOString(),
            items_found: 0,
            items_upserted: 0,
            error_message: errMsg,
          })
          .select("id")
          .single();

        runs.push({
          source_id: source.id,
          run_id: failRow?.id ?? "",
          status: "failure",
          items_found: 0,
          items_upserted: 0,
          error_message: errMsg,
          duration_ms: Date.now() - runStart,
        });
        continue;
      }

      const runId = runRow.id;

      try {
        const result = await runParser(source.parser_key, {
          baseUrl: source.base_url,
          feedUrl: source.feed_url ?? null,
          parserKey: source.parser_key,
        });

        if (result.error) {
          const { error_class, error_message } = classifyError(new Error(result.error));
          await supabase.from("source_run_failures").insert({
            source_run_id: runId,
            error_class,
            error_message,
          });
          await supabase
            .from("source_runs")
            .update({
              status: "failure",
              completed_at: new Date().toISOString(),
              items_found: 0,
              items_upserted: 0,
              duration_ms: Date.now() - runStart,
              error_message: result.error,
            })
            .eq("id", runId);

          runs.push({
            source_id: source.id,
            run_id: runId,
            status: "failure",
            items_found: 0,
            items_upserted: 0,
            error_message: result.error,
            duration_ms: Date.now() - runStart,
          });
          continue;
        }

        const opportunities = result.opportunities;

        const prepped = opportunities.map((opp) => {
          const normalizedUrl = normalizeUrl(opp.source_url);
          const urlHash = sha256(normalizedUrl);
          const payload = buildStablePayloadForHash(opp);
          const payloadHash = sha256(canonicalJsonStringify(payload));
          const hasExternalId = opp.external_id != null && opp.external_id !== "";
          return {
            opp,
            normalizedUrl,
            urlHash,
            payload,
            payloadHash,
            hasExternalId,
          };
        });

        const seenExternalIds = new Set(prepped.filter((p) => p.hasExternalId).map((p) => p.opp.external_id));
        const seenUrlHashes = new Set(prepped.filter((p) => !p.hasExternalId).map((p) => p.urlHash));

        const prevHashByKey = new Map<string, string>();
        const withExtId = prepped.filter((p) => p.hasExternalId);
        const withoutExtId = prepped.filter((p) => !p.hasExternalId);

        if (withExtId.length > 0) {
          const extIds = withExtId.map((p) => p.opp.external_id);
          const { data: recs } = await supabase
            .from("source_records")
            .select("external_id, payload_hash")
            .eq("source_id", source.id)
            .in("external_id", extIds);
          for (const r of recs ?? []) {
            prevHashByKey.set(r.external_id, r.payload_hash);
          }
        }

        if (withoutExtId.length > 0) {
          const urlHashes = withoutExtId.map((p) => p.urlHash);
          const { data: recs } = await supabase
            .from("source_records")
            .select("source_url_hash, payload_hash")
            .eq("source_id", source.id)
            .is("external_id", null)
            .in("source_url_hash", urlHashes);
          for (const r of recs ?? []) {
            prevHashByKey.set(r.source_url_hash, r.payload_hash);
          }
        }

        let createdCount = 0;
        let updatedCount = 0;

        for (const { opp, normalizedUrl, urlHash, payload, payloadHash, hasExternalId } of prepped) {
          const rawPayload = {
            ...payload,
            updated_at: new Date().toISOString(),
          } as Record<string, unknown>;

          const { error: stageErr } = await supabase.rpc("upsert_source_record_by_urlhash", {
            p_source_id: source.id,
            p_source_run_id: runId,
            p_source_url: opp.source_url,
            p_source_url_normalized: normalizedUrl,
            p_source_url_hash: urlHash,
            p_raw_payload: rawPayload,
            p_payload_hash: payloadHash,
            p_external_id: hasExternalId ? opp.external_id : null,
          });
          if (stageErr) {
            await supabase.from("source_run_failures").insert({
              source_run_id: runId,
              error_class: "schema_error",
              error_message: stageErr.message,
            });
            await supabase
              .from("source_runs")
              .update({
                status: "failure",
                completed_at: new Date().toISOString(),
                items_found: opportunities.length,
                items_upserted: 0,
                duration_ms: Date.now() - runStart,
                error_message: stageErr.message,
              })
              .eq("id", runId);
            throw new Error(`source_records upsert failed: ${stageErr.message}`);
          }

          const oppPayload = {
            source: opp.source,
            external_id: opp.external_id,
            source_url: opp.source_url,
            province: opp.province,
            category: opp.category,
            title: opp.title,
            description: opp.description,
            estimated_value: opp.estimated_value,
            closing_date: opp.closing_date,
            issuing_entity: opp.issuing_entity,
            status: opp.status,
            updated_at: new Date().toISOString(),
          };

          const { data: upsertedRow, error: upsertErr } = await supabase
            .from("opportunities")
            .upsert(oppPayload, { onConflict: "source,external_id" })
            .select("id")
            .single();

          if (!upsertErr && upsertedRow) {
            const lookupKey = hasExternalId ? opp.external_id : urlHash;
            const prevHash = prevHashByKey.get(lookupKey);
            const isNew = prevHash === undefined;
            const isUpdated = prevHash !== undefined && prevHash !== payloadHash;

            if (isNew) {
              createdCount++;
              await supabase.from("opportunity_events").insert({
                opportunity_id: upsertedRow.id,
                event_type: "created",
                detected_at: new Date().toISOString(),
                source_run_id: runId,
              });
              await computeOpportunityIntelligence(upsertedRow.id, {
                id: upsertedRow.id,
                estimated_value: opp.estimated_value,
                closing_date: opp.closing_date,
              });
            } else if (isUpdated) {
              updatedCount++;
              await supabase.from("opportunity_events").insert({
                opportunity_id: upsertedRow.id,
                event_type: "updated",
                detected_at: new Date().toISOString(),
                source_run_id: runId,
              });
              await computeOpportunityIntelligence(upsertedRow.id, {
                id: upsertedRow.id,
                estimated_value: opp.estimated_value,
                closing_date: opp.closing_date,
              });
            }
          }
        }

        const { count, error: countErr } = await supabase
          .from("source_records")
          .select("*", { count: "exact", head: true });
        if (countErr) throw new Error(`source_records_count_failed: ${countErr.message}`);
        console.log("[runAgentRunner] source_records count after staging:", count);

        // Stale detection: archive records not seen in STALE_DAYS
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - STALE_DAYS);
        const cutoffIso = cutoffDate.toISOString();

        // Fetch all stale candidates and filter in memory (Supabase .not().in() is awkward)
        const { data: allStaleCandidates } = await supabase
          .from("source_records")
          .select("id, external_id, source_url_hash, raw_payload")
          .eq("source_id", source.id)
          .eq("is_deleted", false)
          .lt("last_seen_at", cutoffIso);

        const toArchive =
          allStaleCandidates?.filter((r) => {
            if (r.external_id != null) return !seenExternalIds.has(r.external_id);
            return !seenUrlHashes.has(r.source_url_hash);
          }) ?? [];

        let archivedCount = 0;
        for (const rec of toArchive) {
          const oppExtId = rec.external_id ?? rec.source_url_hash;
          const raw = rec.raw_payload as Record<string, unknown> | null;
          const extIdFromPayload = raw?.external_id as string | undefined;
          const effectiveExtId = rec.external_id ?? extIdFromPayload ?? rec.source_url_hash;

          const { data: oppRow } = await supabase
            .from("opportunities")
            .select("id")
            .eq("source", source.parser_key)
            .eq("external_id", effectiveExtId)
            .maybeSingle();

          if (oppRow) {
            await supabase
              .from("opportunities")
              .update({ status: "archived", archived_at: new Date().toISOString() })
              .eq("id", oppRow.id);

            await supabase.from("opportunity_events").insert({
              opportunity_id: oppRow.id,
              event_type: "archived",
              detected_at: new Date().toISOString(),
              source_run_id: runId,
            });

            await computeOpportunityIntelligence(oppRow.id);
            archivedCount++;
          }

          await supabase
            .from("source_records")
            .update({
              is_deleted: true,
              deleted_at: new Date().toISOString(),
            })
            .eq("id", rec.id);
        }

        const itemsUpserted = createdCount + updatedCount;
        const durationMs = Date.now() - runStart;

        await supabase
          .from("source_runs")
          .update({
            status: "success",
            completed_at: new Date().toISOString(),
            items_found: opportunities.length,
            items_upserted: itemsUpserted,
            items_created: createdCount,
            items_updated: updatedCount,
            items_archived: archivedCount,
            duration_ms: durationMs,
            error_message: null,
          })
          .eq("id", runId);

        runs.push({
          source_id: source.id,
          run_id: runId,
          status: "success",
          items_found: opportunities.length,
          items_upserted: itemsUpserted,
          duration_ms: durationMs,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        const { error_class, error_message } = classifyError(err);

        await supabase.from("source_run_failures").insert({
          source_run_id: runId,
          error_class,
          error_message,
        });

        await supabase
          .from("source_runs")
          .update({
            status: "failure",
            completed_at: new Date().toISOString(),
            items_found: 0,
            items_upserted: 0,
            duration_ms: Date.now() - runStart,
            error_message: msg,
          })
          .eq("id", runId);

        runs.push({
          source_id: source.id,
          run_id: runId,
          status: "failure",
          items_found: 0,
          items_upserted: 0,
          error_message: msg,
          duration_ms: Date.now() - runStart,
        });
      }
    }

    return {
      ok: true,
      parser_key: parserKey,
      runs,
      total_duration_ms: Date.now() - totalStart,
    };
  } finally {
    await supabase.rpc("release_parser_lock", { p_parser_key: parserKey });
  }
}
