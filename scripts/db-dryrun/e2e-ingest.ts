/**
 * End-to-end open-data ingest into a LOCAL database (PGlite built from the
 * schema-only live snapshot + migrations 051/052/053). Never touches live.
 *
 *   cd scripts/db-dryrun && npm install && cd ../.. && npx tsx scripts/db-dryrun/e2e-ingest.ts [--live]
 *
 * Default: fixtures (real CSV samples). --live: download the real public
 * GCSurplus ZIP, CanadaBuys CSV and NS CSVs over HTTPS (read-only GET).
 */
import { readFileSync } from "fs";
import path from "path";
// @ts-ignore - plain ESM helper
import { liveDb } from "./live_base.mjs";
import { ingestOpenDataFeeds } from "../../lib/opendata/ingest";
import { computeFeedFreshness, type FeedKey } from "../../lib/opendata/freshness";

type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>; exec: (sql: string) => Promise<unknown> };

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const MIG = path.join(ROOT, "supabase/migrations");
const FIX = path.join(ROOT, "fixtures/open-data");
const live = process.argv.includes("--live");

/** Minimal supabase-js-shaped client over PGlite: from(t).upsert / insert. */
function pgClient(db: Db) {
  const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return {
    from(table: string) {
      return {
        async upsert(rows: Record<string, unknown>[] | Record<string, unknown>, opts?: { onConflict?: string; count?: string }) {
          const list = Array.isArray(rows) ? rows : [rows];
          if (!list.length) return { error: null, count: 0 };
          try {
            const cols = Object.keys(list[0]!);
            const conflict = (opts?.onConflict || "id").split(",").map((c) => c.trim());
            const params: unknown[] = [];
            const values = list
              .map((r) => "(" + cols.map((c) => { const v = r[c]; params.push(v != null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v); return `$${params.length}`; }).join(",") + ")")
              .join(",");
            const updates = cols.filter((c) => !conflict.includes(c) && c !== "first_seen_at").map((c) => `${ident(c)}=EXCLUDED.${ident(c)}`).join(",");
            const sql = `INSERT INTO public.${ident(table)} (${cols.map(ident).join(",")}) VALUES ${values} ON CONFLICT (${conflict.map(ident).join(",")}) DO UPDATE SET ${updates}`;
            await db.query(sql, params);
            return { error: null, count: list.length };
          } catch (e) {
            return { error: { message: (e as Error).message }, count: null };
          }
        },
        async insert(row: Record<string, unknown>) {
          try {
            const cols = Object.keys(row);
            await db.query(`INSERT INTO public.${ident(table)} (${cols.map(ident).join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")})`, cols.map((c) => row[c]));
            return { error: null };
          } catch (e) {
            return { error: { message: (e as Error).message } };
          }
        },
      };
    },
  };
}

let failed = 0;
const check = (ok: boolean, name: string, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

async function counts(db: Db) {
  const r = (await db.query(`select
    (select count(*) from public.price_history_lots where feed_key='gcsurplus_sold')::int gc,
    (select count(*) from public.price_history_lots where feed_key='ns_surplus')::int ns,
    (select count(*) from public.tender_notices)::int cb,
    (select count(*) from public.open_data_ingest_runs)::int runs`)).rows[0];
  return r as { gc: number; ns: number; cb: number; runs: number };
}

async function main() {
  const db: Db = await liveDb({ quiet: true });
  for (const f of ["20261109150000_051_security_hardening.sql", "20261109150100_052_open_data_feeds.sql", "20261109150200_053_saved_searches_inbox.sql"]) {
    await db.exec(readFileSync(path.join(MIG, f), "utf8"));
  }
  await db.exec("SET ROLE service_role");
  const client = pgClient(db) as any;
  const fixtures = live
    ? undefined
    : {
        gcsurplusSoldCsv: readFileSync(path.join(FIX, "gcsurplus_sold_sample.csv"), "utf8"),
        canadabuysCsv: readFileSync(path.join(FIX, "canadabuys_open_tenders_sample.csv"), "utf8"),
        nsTenderCsv: readFileSync(path.join(FIX, "ns_surplus_tender_sample.csv"), "utf8"),
        nsRealCsv: readFileSync(path.join(FIX, "ns_surplus_real_property_sample.csv"), "utf8"),
      };
  console.log(`mode: ${live ? "LIVE public downloads" : "fixtures"}`);

  // Run 1
  const t0 = Date.now();
  const r1 = await ingestOpenDataFeeds({ client, fixtures });
  for (const r of r1) console.log(`run1 ${r.feed_key}: ${r.status} parsed=${r.rows_parsed} upserted=${r.rows_upserted}${r.error_message ? " err=" + r.error_message : ""}`);
  check(r1.every((r) => r.status === "ok"), "run 1: all three feeds ok", `${Date.now() - t0} ms`);
  const c1 = await counts(db);
  console.log("after run 1:", JSON.stringify(c1));
  check(c1.gc > 0 && c1.ns > 0 && c1.cb > 0, "rows landed in price_history_lots (GCSurplus, NS) and tender_notices");
  const gcParsed = r1.find((r) => r.feed_key === "gcsurplus_sold")!.rows_parsed;
  check(c1.gc === gcParsed, "GCSurplus: one DB row per parsed comp (no duplicates)", `${c1.gc} rows / ${gcParsed} parsed`);
  const firstSeen = (await db.query(`select external_id, first_seen_at, last_seen_at from public.price_history_lots order by external_id limit 1`)).rows[0];

  // Run 2 (idempotency)
  await new Promise((r) => setTimeout(r, 20));
  const r2 = await ingestOpenDataFeeds({ client, fixtures });
  const c2 = await counts(db);
  console.log("after run 2:", JSON.stringify(c2));
  check(c2.gc === c1.gc && c2.ns === c1.ns && c2.cb === c1.cb, "run 2 is idempotent (row counts unchanged)");
  check(c2.runs === c1.runs + 3, "every run is recorded in open_data_ingest_runs", `${c1.runs} -> ${c2.runs}`);
  const again = (await db.query(`select first_seen_at, last_seen_at from public.price_history_lots where external_id=$1`, [firstSeen.external_id])).rows[0];
  check(String(again.first_seen_at) === String(firstSeen.first_seen_at), "first_seen_at preserved on re-ingest");
  check(r2.every((r) => r.status === "ok"), "run 2: all ok");
  const dupIds = (await db.query(`select feed_key, external_id, count(*) n from public.price_history_lots group by 1,2 having count(*)>1`)).rows;
  check(dupIds.length === 0, "no duplicate (feed_key, external_id)");
  const dupTitles = (await db.query(`select count(*)::int n from public.price_history_lots where length(title)>=2 and length(title)%2=0 and left(title,length(title)/2)=right(title,length(title)/2)`)).rows[0].n;
  check(dupTitles === 0, "no doubled GCSurplus titles stored", `${dupTitles}`);

  // Broken upstream: error is recorded, existing data kept (never wiped)
  const r3 = await ingestOpenDataFeeds({ client, feeds: ["canadabuys"], fixtures: { canadabuysCsv: "<html>maintenance</html>" } as any });
  const c3 = await counts(db);
  console.log(`broken canadabuys run: ${r3[0]!.status} ${r3[0]!.error_message ?? ""}`);
  check(c3.cb === c2.cb, "broken feed does not delete existing tenders", `${c3.cb}`);
  const lastCb = (await db.query(`select status from public.open_data_ingest_runs where feed_key='canadabuys' order by retrieved_at desc, created_at desc limit 1`)).rows[0];
  check(r3[0]!.status === "error" && lastCb.status === "error", "garbage upstream response is recorded as an error run (not a silent 'ok')", `${r3[0]!.status}/${lastCb.status} rows_parsed=${r3[0]!.rows_parsed}`);

  // Staleness
  const runs = (await db.query(`select feed_key, status, retrieved_at::text, rows_upserted from public.open_data_ingest_runs`)).rows;
  const fresh = (["gcsurplus_sold", "canadabuys", "ns_surplus"] as FeedKey[]).map((f) => computeFeedFreshness(runs, f));
  console.log("freshness now:", JSON.stringify(fresh.map((f) => [f.feed_key, f.state])));
  check(fresh.find((f) => f.feed_key === "gcsurplus_sold")!.state === "fresh", "GCSurplus fresh right after ingest");
  const future = new Date(Date.now() + 3 * 86_400_000);
  check(fresh.find((f) => f.feed_key === "canadabuys")!.state === "failing", "CanadaBuys shown as 'failing' after the broken run", fresh.find((f) => f.feed_key === "canadabuys")!.state);
  const cbLater = computeFeedFreshness(runs, "canadabuys", future);
  check(cbLater.state === "stale", "CanadaBuys reported stale after 3 days without a successful run", cbLater.state);
  check(computeFeedFreshness([], "ns_surplus").state === "never", "never-loaded feed is 'never', not empty-success");

  // Privacy: schema + stored values
  const cols = (await db.query(`select table_name, column_name from information_schema.columns where table_schema='public' and table_name in ('price_history_lots','tender_notices','open_data_ingest_runs')`)).rows;
  const banned = /custodian|sales_person|email|phone|postal|awarded_to|paid_party|awardee|payer|contact/i;
  const badCols = cols.filter((c: any) => banned.test(c.column_name));
  check(badCols.length === 0, "no personal/contact columns in open-data tables", badCols.map((c: any) => c.column_name).join(","));
  const pii = (await db.query(`select count(*)::int n from (
     select title||' '||coalesce(description,'')||' '||coalesce(city,'') t from public.price_history_lots
     union all select title||' '||coalesce(description,'')||' '||coalesce(issuing_entity,'') from public.tender_notices) x
     where t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}' or t ~ '\\(?[0-9]{3}\\)?[ .-][0-9]{3}[ .-][0-9]{4}'`)).rows[0].n;
  check(pii === 0, "no email addresses or phone numbers stored in any open-data row", `${pii} rows`);
  if (pii) {
    const ex = (await db.query(`select src, fld, substring(v from greatest(1, coalesce(nullif(position('@' in v),0), 1)-50) for 110) snip from (
      select 'phl:'||feed_key src, 'title' fld, title v from public.price_history_lots union all
      select 'phl:'||feed_key, 'description', description from public.price_history_lots union all
      select 'phl:'||feed_key, 'city', city from public.price_history_lots union all
      select 'tn', 'title', title from public.tender_notices union all
      select 'tn', 'description', description from public.tender_notices union all
      select 'tn', 'issuing_entity', issuing_entity from public.tender_notices) x
      where v ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}' or v ~ '\\(?[0-9]{3}\\)?[ .-][0-9]{3}[ .-][0-9]{4}'`)).rows;
    const by: Record<string, number> = {};
    for (const e of ex) by[`${e.src}.${e.fld}`] = (by[`${e.src}.${e.fld}`] || 0) + 1;
    console.log("PII offenders by field:", JSON.stringify(by));
    for (const e of ex.slice(0, 6)) console.log("  e.g.", e.src, e.fld, JSON.stringify(e.snip).replace(/[A-Za-z0-9._%+-]+@/g, "***@"));
  }
  const lic = (await db.query(`select count(*)::int n from public.price_history_lots where licence_id is null or source_url is null`)).rows[0].n;
  check(lic === 0, "every stored row carries licence_id + source_url (attribution)");

  // Signed-out cannot read the raw tables via PostgREST
  await db.exec("RESET ROLE; SET ROLE anon");
  let anonBlocked = false;
  try { await db.query("select 1 from public.price_history_lots limit 1"); } catch { anonBlocked = true; }
  check(anonBlocked, "anon (signed-out PostgREST) cannot read price_history_lots directly");
  await db.exec("RESET ROLE");

  console.log(`\nSUMMARY: ${failed === 0 ? "ALL PASS" : failed + " FAILED"}`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
