import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EVENTS } from "../lib/analytics/catalog";
import { sanitizeProps, track } from "../lib/analytics/track";

async function main() {
  const spec = JSON.parse(readFileSync(new URL("../docs/analytics/events.json", import.meta.url), "utf8").toString());
  const names = spec.events.map((e: { event_name: string }) => e.event_name).sort();
  assert.deepEqual(Object.keys(EVENTS).sort(), names, "catalog matches launch/data/events.json");
  assert.equal(names.length, 21);
  const sql = readFileSync(new URL("../supabase/migrations/20261109150400_055_analytics_events.sql", import.meta.url), "utf8");
  for (const n of names) assert.ok(sql.includes(`'${n}'`), `055 CHECK allows ${n}`);

  // PII never survives sanitising.
  const p = sanitizeProps("page_viewed", {
    path: "/comps?q=truck&email=a@b.co",
    referrer_host: "https://news.example.com/a?b=c",
    utm_source: "jane.doe@example.com",
    utm_medium: "613-555-0199",
    utm_campaign: "launch week free text",
    utm_content: "10.0.0.1",
    email: "x@y.z",
  });
  assert.deepEqual(p, { path: "/comps", referrer_host: "news.example.com" });
  assert.deepEqual(sanitizeProps("checkout_started", { plan_key: "pro_monthly", amount: 12 }), { plan_key: "pro_monthly" });

  // Off by default: nothing written.
  delete process.env.ANALYTICS_EVENTS_ENABLED;
  let writes = 0;
  const db = { from: () => ({ insert: async () => { writes++; return { error: null }; } }) };
  assert.equal(await track("pricing_viewed", { path: "/pricing" }, { db }), false);
  assert.equal(writes, 0);
  process.env.ANALYTICS_EVENTS_ENABLED = "1";
  let row: any = null;
  const db2 = { from: () => ({ insert: async (r: any) => { row = r; return { error: null }; } }) };
  assert.equal(await track("alert_rule_created", { rule_id: "abc", has_region: true, query: "my secret" }, { db: db2, userId: "u1", sessionId: "bad id!" }), true);
  assert.deepEqual(row, { event_name: "alert_rule_created", user_id: "u1", session_id: null, props: { rule_id: "abc", has_region: true } });
  console.log("analytics: 8 OK");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
