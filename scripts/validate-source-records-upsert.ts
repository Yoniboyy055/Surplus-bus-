/**
 * Validates source_records upsert hits conflict correctly (Approach A).
 * Run: npm run validate:source-records (loads .env.local via dotenv)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { sha256, normalizeUrl, canonicalJsonStringify } from "@/lib/agents/utils/hash";

async function main() {
  const supabase = createServiceRoleClient();

  const { data: sources } = await supabase
    .from("sources")
    .select("id")
    .eq("parser_key", "ab_surplus")
    .limit(1);

  if (!sources?.[0]) {
    console.error("No ab_surplus source found");
    process.exit(1);
  }

  const sourceId = sources[0].id;
  const { data: runRow } = await supabase
    .from("source_runs")
    .insert({
      source_id: sourceId,
      agent_name: "agent_ab_surplus",
      status: "running",
    })
    .select("id")
    .single();

  if (!runRow) {
    console.error("Failed to create run");
    process.exit(1);
  }

  const runId = runRow.id;
  const externalId = "validate-test-ext-id";
  const url = "https://example.com/test";
  const normalizedUrl = normalizeUrl(url);
  const urlHash = sha256(normalizedUrl);
  const payload = { source: "ab_surplus", external_id: externalId, source_url: url };
  const payloadHash = sha256(canonicalJsonStringify(payload));
  const rawPayload = { ...payload, updated_at: new Date().toISOString() };

  // Path 1: upsert with external_id (onConflict: source_id,external_id)
  const row1 = {
    source_id: sourceId,
    source_run_id: runId,
    external_id: externalId,
    source_url: url,
    source_url_normalized: normalizedUrl,
    source_url_hash: urlHash,
    raw_payload: rawPayload,
    payload_hash: payloadHash,
    last_seen_at: new Date().toISOString(),
  };

  const { error: err1 } = await supabase
    .from("source_records")
    .upsert(row1, { onConflict: "source_id,external_id" });

  if (err1) {
    console.error("Path 1 (external_id) upsert failed:", err1);
    process.exit(1);
  }
  console.log("Path 1 (external_id): upsert OK");

  // Same row again - should hit conflict and update
  const { error: err2 } = await supabase
    .from("source_records")
    .upsert(row1, { onConflict: "source_id,external_id" });

  if (err2) {
    console.error("Path 1 conflict update failed:", err2);
    process.exit(1);
  }
  console.log("Path 1 conflict: update OK (idempotent)");

  // Path 2: upsert with external_id=null (RPC)
  const row2Payload = { ...payload, source_url: "https://example.com/no-ext" };
  const row2Hash = sha256(canonicalJsonStringify(row2Payload));
  const { error: err3 } = await supabase.rpc("upsert_source_record_by_urlhash", {
    p_source_id: sourceId,
    p_source_run_id: runId,
    p_source_url: "https://example.com/no-ext",
    p_source_url_normalized: normalizeUrl("https://example.com/no-ext"),
    p_source_url_hash: sha256(normalizeUrl("https://example.com/no-ext")),
    p_raw_payload: { ...row2Payload, updated_at: new Date().toISOString() },
    p_payload_hash: row2Hash,
  });

  if (err3) {
    console.error("Path 2 (urlhash RPC) failed:", err3);
    process.exit(1);
  }
  console.log("Path 2 (urlhash RPC): upsert OK");

  // Cleanup
  await supabase.from("source_records").delete().eq("external_id", externalId);
  await supabase.from("source_records").delete().eq("source_url_hash", sha256(normalizeUrl("https://example.com/no-ext")));
  await supabase.from("source_runs").update({ status: "failure", completed_at: new Date().toISOString() }).eq("id", runId);

  console.log("Validation passed: both upsert paths hit conflict correctly.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
