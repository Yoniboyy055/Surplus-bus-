import { z } from "zod";

const candidateSchema = z.object({
  source_platform: z.string().min(1),
  source_url: z.string().url(),
  source_id: z.string().min(1),
  property_data: z.record(z.string(), z.any()).default({}),
  quality_score: z.number().min(0).max(100).default(50),
  quality_breakdown: z.record(z.string(), z.any()).default({}),
  bucket: z.enum(["approve", "review", "junk"]).default("review")
});

export async function startIngestionRun(supabase: any, agentName: string, sourceUrl: string) {
  const { data } = await supabase
    .from("ingestion_runs")
    .insert({ agent_name: agentName, source_url: sourceUrl, status: "running" })
    .select("id")
    .single();

  return data?.id as string | undefined;
}

export async function completeIngestionRun(
  supabase: any,
  runId: string | undefined,
  status: "success" | "failure",
  metrics: { items_found: number; items_queued: number; error_message?: string }
) {
  if (!runId) return;

  await supabase
    .from("ingestion_runs")
    .update({
      status,
      items_found: metrics.items_found,
      items_queued: metrics.items_queued,
      error_message: metrics.error_message ?? null,
      completed_at: new Date().toISOString()
    })
    .eq("id", runId);
}

export async function queueCandidates(supabase: any, runId: string | undefined, rawCandidates: unknown[]) {
  const validated = rawCandidates
    .map((candidate) => candidateSchema.safeParse(candidate))
    .filter((result) => result.success)
    .map((result) => result.data);

  if (!validated.length) {
    return { itemsFound: rawCandidates.length, itemsQueued: 0, queuedIds: [] as string[] };
  }

  const { data, error } = await supabase
    .from("property_candidates")
    .upsert(validated, { onConflict: "source_id", ignoreDuplicates: false })
    .select("source_id");

  if (error) {
    await supabase.from("ingestion_failures").insert({
      run_id: runId ?? null,
      error_message: error.message,
      payload: { candidate_count: validated.length }
    });
    throw error;
  }

  return {
    itemsFound: rawCandidates.length,
    itemsQueued: data?.length ?? 0,
    queuedIds: (data ?? []).map((row: { source_id: string }) => row.source_id)
  };
}
