/**
 * Proves the search filters behave the same in Postgres as in the JS used for facets and tests,
 * and prints before/after search results. Local only (PGlite).
 *
 *   npx tsx scripts/db-dryrun/search-parity.ts                       # repo fixture (CI)
 *   npx tsx scripts/db-dryrun/search-parity.ts --batches <dir>       # local copy of live data (ingest batch SQL)
 */
import { readFileSync, readdirSync } from "fs";
import path from "path";
// @ts-ignore resolved from scripts/db-dryrun/node_modules
import { PGlite } from "@electric-sql/pglite";
import { classifyTitle, kindFilters, planSearch, assessHomogeneity, type LotKind } from "../../lib/opendata/search";
import { computeCompStats } from "../../lib/opendata/comps";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const bi = process.argv.indexOf("--batches");
type Row = { title: string; sold_amount: number | null };
let rows: Row[];
if (bi > 0) {
  const dir = process.argv[bi + 1]!;
  rows = [];
  for (const f of readdirSync(dir).filter((f) => /^batch_\d+\.sql$/.test(f)).sort()) {
    for (const st of readFileSync(path.join(dir, f), "utf8").split("\n")) {
      if (!st.includes('"price_history_lots"')) continue;
      const m = st.match(/\$(j+x*)\$([\s\S]*)\$\1\$::jsonb/);
      if (m) for (const r of JSON.parse(m[2]!)) rows.push({ title: r.title, sold_amount: r.sold_amount });
    }
  }
} else {
  rows = JSON.parse(readFileSync(path.join(ROOT, "fixtures/open-data/search_relevance_sample.json"), "utf8")).rows;
}
console.log(`source: ${bi > 0 ? "local copy of live data" : "repo fixture"} · ${rows.length} lots`);

const db = new PGlite();
await db.exec(`create table lots(id serial primary key, title text not null, sold_amount numeric)`);
for (let i = 0; i < rows.length; i += 2000) {
  await db.query(`insert into lots(title, sold_amount) select x->>'title', (x->>'sold_amount')::numeric from jsonb_array_elements($1::jsonb) x`, [JSON.stringify(rows.slice(i, i + 2000))]);
}

let fail = 0;
const check = (ok: boolean, msg: string) => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} | ${msg}`); };

// 1. Kind filters: Postgres ~* vs JS classifyTitle, row by row
const js = new Map<LotKind, number>();
for (const r of rows) js.set(classifyTitle(r.title), (js.get(classifyTitle(r.title)) || 0) + 1);
for (const k of ["vehicle", "powersport", "equipment", "trailer", "part", "other"] as LotKind[]) {
  const params: string[] = [];
  const where = kindFilters(k).map((f) => { params.push(f.pattern); return `${f.op === "imatch" ? "" : "not "}(title ~* $${params.length})`; }).join(" and ");
  const sql = (await db.query<{ n: number }>(`select count(*)::int n from lots where ${where}`, params)).rows[0]!.n;
  check(sql === (js.get(k) || 0), `kind ${k}: Postgres ${sql} = JS ${js.get(k) || 0}`);
}

// 2. Query matching: Postgres ILIKE groups vs JS
const qs = ["truck", "pickup", "pick-up", "pick up", "f150", "F-150", "ford f150", "generator", "laptop", "forklift"];
async function sqlMatches(q: string): Promise<Row[]> {
  const plan = planSearch(q);
  const params: string[] = [];
  const where = plan.groups.map((g) => "(" + g.map((v) => { params.push(`%${v}%`); return `title ilike $${params.length}`; }).join(" or ") + ")").join(" and ");
  return (await db.query<Row>(`select title, sold_amount::float8 sold_amount from lots where ${where}`, params)).rows;
}
for (const q of qs) {
  const s = (await sqlMatches(q)).length;
  const plan = planSearch(q);
  const j = rows.filter((r) => plan.groups.every((g) => g.some((v) => r.title.toLowerCase().includes(v)))).length;
  check(s === j, `query "${q}": Postgres ${s} = JS ${j}`);
}
check((await sqlMatches("pickup")).length === (await sqlMatches("pick-up")).length && (await sqlMatches("pick up")).length === (await sqlMatches("pickup")).length, "pickup = pick-up = pick up");
check((await sqlMatches("f150")).length === (await sqlMatches("F-150")).length, "f150 = F-150");

// 3. Before / after for the four example searches
const fmt = (n?: number) => (n == null ? "—" : `C$${Math.round(n).toLocaleString("en-CA")}`);
console.log("\nquery | BEFORE: title ILIKE '%q%' → n, p25/median/p75 | AFTER: matches → default kind → n, range or note");
for (const q of ["truck", "pickup", "generator", "laptop"]) {
  const before = (await db.query<Row>(`select title, sold_amount::float8 sold_amount from lots where title ilike $1 and sold_amount > 0`, [`%${q}%`])).rows;
  const b = computeCompStats(before.map((r) => r.sold_amount));
  const all = await sqlMatches(q);
  const plan = planSearch(q);
  const kind: LotKind | null = plan.vehicleIntent ? "vehicle" : null;
  const used = kind ? all.filter((r) => classifyTitle(r.title) === kind) : all;
  const a = computeCompStats(used.map((r) => r.sold_amount));
  const h = assessHomogeneity(used);
  const kinds = Object.entries(h.kinds).sort((x, y) => (y[1] as number) - (x[1] as number)).map(([k, v]) => `${k} ${v}`).join(", ");
  const dom = h.dominant ? all.filter((r) => classifyTitle(r.title) === h.dominant) : [];
  const d = computeCompStats(dom.map((r) => r.sold_amount));
  console.log(
    `${q} | BEFORE n=${b?.n ?? 0}, ${fmt(b?.p25)} / ${fmt(b?.median)} / ${fmt(b?.p75)}` +
      ` | AFTER ${all.length} matches → ${kind ?? "all kinds"} → n=${a?.n ?? 0}, ` +
      (h.ok ? `range ${fmt(a?.p25)} / ${fmt(a?.median)} / ${fmt(a?.p75)}` : `no range (${h.reason}; kinds: ${kinds}); one tap on "${h.dominant}" → n=${d?.n}, ${fmt(d?.p25)} / ${fmt(d?.median)} / ${fmt(d?.p75)}`)
  );
}
console.log(`\n${fail ? "FAILED" : "ALL PASS"} (${fail} failures)`);
process.exit(fail ? 1 : 0);
