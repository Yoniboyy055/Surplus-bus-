import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { runParser } from "@/lib/agents/parsers";

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

export async function executeAgentRun(parserKey: string): Promise<RunResult> {
  const totalStart = Date.now();
  const supabase = createServiceRoleClient();

  const { data: sources, error: sourcesError } = await supabase
    .from("sources")
    .select("id, name, base_url, feed_url, parser_key")
    .eq("parser_key", parserKey)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (sourcesError) {
    throw new Error(`Failed to load sources: ${sourcesError.message}`);
  }

  if (!sources?.length) {
    return {
      ok: true,
      parser_key: parserKey,
      runs: [],
      message: "No active sources for this parser_key",
    };
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
      runs.push({
        source_id: source.id,
        run_id: "",
        status: "failure",
        items_found: 0,
        items_upserted: 0,
        error_message: insertErr?.message ?? "Failed to create run",
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
        await supabase
          .from("source_runs")
          .update({
            status: "failure",
            completed_at: new Date().toISOString(),
            items_found: 0,
            items_upserted: 0,
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
      let upserted = 0;

      for (const opp of opportunities) {
        const { data: existing } = await supabase
          .from("opportunities")
          .select("id")
          .eq("source", opp.source)
          .eq("external_id", opp.external_id)
          .maybeSingle();

        const payload = {
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
          .upsert(payload, { onConflict: "source,external_id" })
          .select("id")
          .single();

        if (!upsertErr && upsertedRow) {
          upserted++;
          const isNew = !existing;
          await supabase.from("opportunity_events").insert({
            opportunity_id: upsertedRow.id,
            event_type: isNew ? "created" : "updated",
            detected_at: new Date().toISOString(),
            source_run_id: runId,
          });
        }
      }

      await supabase
        .from("source_runs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          items_found: opportunities.length,
          items_upserted: upserted,
          error_message: null,
        })
        .eq("id", runId);

      runs.push({
        source_id: source.id,
        run_id: runId,
        status: "success",
        items_found: opportunities.length,
        items_upserted: upserted,
        duration_ms: Date.now() - runStart,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("source_runs")
        .update({
          status: "failure",
          completed_at: new Date().toISOString(),
          items_found: 0,
          items_upserted: 0,
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
}
