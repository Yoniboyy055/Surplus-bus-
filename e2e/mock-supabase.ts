/**
 * Local stand-in for Supabase (GoTrue + PostgREST subset) over PGlite, for e2e tests only.
 *
 * The database is the schema-only reconstruction of LIVE plus the fix migrations
 * (051, 052, 053, 055), so real RLS policies, grants and triggers decide every request:
 * anon / authenticated / service_role are real Postgres roles and auth.uid() comes
 * from the request JWT. Seed data comes from running the real ingest code on the
 * repo fixtures plus synthetic GCSurplus staff contact details (to prove they never
 * reach the DB, API or UI). Never connects to any live service.
 *
 *   npx tsx e2e/mock-supabase.ts      (port 54399; see e2e/README.md)
 */
import http from "node:http";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
// @ts-ignore plain ESM helper
import { liveDb } from "../scripts/db-dryrun/live_base.mjs";
import { ingestOpenDataFeeds } from "../lib/opendata/ingest";
import { parseCsv } from "../lib/opendata/csv";

export const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54399);
export const JWT_SECRET = "e2e-local-only-secret-not-used-anywhere-else";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MIG = path.join(ROOT, "supabase/migrations");
const FIX = path.join(ROOT, "fixtures/open-data");

export const USERS = {
  member: { id: "11111111-1111-4111-8111-111111111111", email: "member@example.test" },
  operator: { id: "22222222-2222-4222-8222-222222222222", email: "operator@example.test" },
};
/** Synthetic GCSurplus staff contacts injected into the fixture. None may ever be served. */
export const SYNTHETIC_STAFF = ["Zelda Quintero", "zelda.quintero@tpsgc-pwgsc.gc.ca", "613-555-0199", "Yuri Okonkwo", "yuri.okonkwo@tpsgc-pwgsc.gc.ca", "819-555-0123"];

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
export function signJwt(payload: Record<string, unknown>) {
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 30, ...payload }));
  return `${h}.${p}.${b64u(crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest())}`;
}
function verifyJwt(tok: string | undefined): Record<string, any> | null {
  if (!tok) return null;
  const [h, p, s] = tok.split(".");
  if (!h || !p || !s) return null;
  const want = b64u(crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest());
  if (want.length !== s.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(s))) return null;
  const c = JSON.parse(Buffer.from(p, "base64url").toString());
  return c.exp && c.exp * 1000 < Date.now() ? null : c;
}
// Fixed iat/exp so the keys are stable across runs (NEXT_PUBLIC_* values are inlined at build time).
export const ANON_KEY = signJwt({ role: "anon", iss: "e2e", iat: 1790000000, exp: 4102444800 });
export const SERVICE_KEY = signJwt({ role: "service_role", iss: "e2e", iat: 1790000000, exp: 4102444800 });
export function sessionFor(u: { id: string; email: string }) {
  const access_token = signJwt({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated" });
  return {
    access_token,
    token_type: "bearer",
    expires_in: 86400 * 30,
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    refresh_token: `rt-${u.id}`,
    user: userJson(u),
  };
}
function userJson(u: { id: string; email: string }) {
  return { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: "2026-11-01T00:00:00Z", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z" };
}

type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; fields: { name: string; dataTypeID: number }[] }>; exec: (sql: string) => Promise<unknown>; transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T> };

const ident = (s: string) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) throw Object.assign(new Error(`bad identifier ${s}`), { status: 400, code: "PGRST100" });
  return `"${s}"`;
};

function selectList(sel: string | null): string {
  if (!sel || sel.trim() === "*") return "*";
  const cols = sel.split(",").map((c) => c.trim()).filter(Boolean);
  if (cols.some((c) => c.includes("("))) throw Object.assign(new Error("embedded resources are not supported by the e2e mock"), { status: 400, code: "PGRST100" });
  return cols.map((c) => (c === "*" ? "*" : ident(c.split("::")[0]!))).join(",");
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function whereClause(sp: URLSearchParams, params: unknown[]): string {
  const parts: string[] = [];
  for (const [col, raw] of sp.entries()) {
    if (RESERVED.has(col)) continue;
    let expr = raw;
    let neg = false;
    if (expr.startsWith("not.")) {
      neg = true;
      expr = expr.slice(4);
    }
    const dot = expr.indexOf(".");
    const op = expr.slice(0, dot);
    const val = expr.slice(dot + 1);
    const c = ident(col);
    const p = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };
    let sql: string;
    switch (op) {
      case "eq": sql = `${c} = ${p(val)}`; break;
      case "neq": sql = `${c} <> ${p(val)}`; break;
      case "gt": sql = `${c} > ${p(val)}`; break;
      case "gte": sql = `${c} >= ${p(val)}`; break;
      case "lt": sql = `${c} < ${p(val)}`; break;
      case "lte": sql = `${c} <= ${p(val)}`; break;
      case "like": sql = `${c}::text LIKE ${p(val.replace(/\*/g, "%"))}`; break;
      case "ilike": sql = `${c}::text ILIKE ${p(val.replace(/\*/g, "%"))}`; break;
      case "is": {
        const v = val.toLowerCase();
        if (!["null", "true", "false"].includes(v)) throw Object.assign(new Error("bad is value"), { status: 400 });
        sql = `${c} IS ${v.toUpperCase()}`;
        break;
      }
      case "in": {
        const inner = val.replace(/^\(/, "").replace(/\)$/, "");
        const items = inner.match(/("([^"\\]|\\.)*"|[^,]+)/g)?.map((s) => s.replace(/^"|"$/g, "")) ?? [];
        sql = items.length ? `${c} IN (${items.map((i) => p(i)).join(",")})` : "false";
        break;
      }
      default:
        throw Object.assign(new Error(`operator ${op} not supported by the e2e mock`), { status: 400, code: "PGRST100" });
    }
    parts.push(neg ? `NOT (${sql})` : sql);
  }
  return parts.length ? ` WHERE ${parts.join(" AND ")}` : "";
}

function orderClause(o: string | null): string {
  if (!o) return "";
  return (
    " ORDER BY " +
    o
      .split(",")
      .map((t) => {
        const [col, ...mods] = t.split(".");
        let s = ident(col!);
        if (mods.includes("desc")) s += " DESC";
        else if (mods.includes("asc")) s += " ASC";
        if (mods.includes("nullslast")) s += " NULLS LAST";
        if (mods.includes("nullsfirst")) s += " NULLS FIRST";
        return s;
      })
      .join(",")
  );
}

function toJsonRows(r: { rows: any[]; fields: { name: string; dataTypeID: number }[] }) {
  const numeric = new Set(r.fields.filter((f) => [1700, 20, 700, 701].includes(f.dataTypeID)).map((f) => f.name));
  return r.rows.map((row) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "bigint") o[k] = Number(v);
      else if (numeric.has(k) && v != null) o[k] = Number(v);
      else if (v instanceof Date) o[k] = v.toISOString();
      else o[k] = v;
    }
    return o;
  });
}

function param(v: unknown) {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
  return v;
}

let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

async function asRole<T>(db: Db, role: string, uid: string | null, claims: object, fn: (tx: Db) => Promise<T>): Promise<T> {
  return serial(() =>
    db.transaction(async (tx: Db) => {
      await tx.query(`select set_config('test.uid', $1, true), set_config('test.jwt', $2, true)`, [uid ?? "", JSON.stringify(claims)]);
      await tx.exec(`SET LOCAL ROLE ${role === "service_role" ? "service_role" : role === "authenticated" ? "authenticated" : "anon"}`);
      return fn(tx);
    })
  );
}

function send(res: http.ServerResponse, status: number, body?: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Expose-Headers": "Content-Range", ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

function pgError(e: any) {
  const msg = String(e?.message || e);
  const code = e?.code || (/permission denied/.test(msg) ? "42501" : /violates row-level security/.test(msg) ? "42501" : /duplicate key/.test(msg) ? "23505" : "XX000");
  const status = e?.status || (code === "42501" ? 403 : code === "23505" ? 409 : /violates|invalid input|does not exist/.test(msg) ? 400 : 500);
  return { status, body: { code, message: msg, details: null, hint: null } };
}

async function readBody(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const s = Buffer.concat(chunks).toString();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export async function buildDb(): Promise<Db> {
  const db: Db = await liveDb({ quiet: true });
  for (const f of ["20261109150000_051_security_hardening.sql", "20261109150100_052_open_data_feeds.sql", "20261109150200_053_saved_searches_inbox.sql", "20261109150400_055_analytics_events.sql"]) {
    await db.exec(readFileSync(path.join(MIG, f), "utf8"));
  }
  for (const u of Object.values(USERS)) await db.query(`insert into auth.users(id,email) values ($1,$2)`, [u.id, u.email]);
  await db.query(`update public.profiles set role='operator', full_name='Ops Person' where id=$1`, [USERS.operator.id]);
  await db.query(`update public.profiles set full_name='Mira Member' where id=$1`, [USERS.member.id]);

  // Seed by running the real ingest code (service role) on the fixtures + synthetic staff contacts.
  const gc = readFileSync(path.join(FIX, "gcsurplus_sold_sample.csv"), "utf8");
  const { headers } = parseCsv(gc) as unknown as { headers: string[] };
  const synth: Record<string, string> = {
    SOLD_AMT: "18250",
    LOT_DESC: "Pickup truck 4x4 - contact Zelda Quintero at zelda.quintero@tpsgc-pwgsc.gc.ca or 613-555-0199",
    MIN_BID_AMT: "0",
    CLOSING_DT: "2025-10-01",
    LOT_ITEMS: "Quantity: 1(unit(s)) : - For further information, please contact Yuri Okonkwo at 819-555-0123 or at yuri.okonkwo@tpsgc-pwgsc.gc.ca",
    LOT_CMNTS: "Custodian Contact: Zelda Quintero 613-555-0199",
    ASSET_LOC_CITY: "Ottawa",
    ASSET_LOC_PROV: "ON",
    CUSTODIAN_PERSON_NM: "Zelda Quintero",
    CUSTODIAN_PERSON_PHN: "613-555-0199",
    CUSTODIAN_EMAIL: "zelda.quintero@tpsgc-pwgsc.gc.ca",
    SALES_PERSON_NM: "Yuri Okonkwo",
    SALES_EMAIL_ADDRS_ID: "yuri.okonkwo@tpsgc-pwgsc.gc.ca",
    SALES_PERSON_PHN: "819-555-0123",
    SALE_CNTRCT_REG_ID: "K9ZZ000001",
  };
  const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const hdrs: string[] = headers ?? gc.split("\n")[0]!.split(",");
  const gcWithSynth = gc.replace(/\s*$/, "") + "\n" + hdrs.map((h) => csvCell(synth[h] ?? "")).join(",") + "\n";

  await db.exec("SET ROLE service_role");
  const client = pgClient(db);
  const results = await ingestOpenDataFeeds({
    client: client as any,
    fixtures: {
      gcsurplusSoldCsv: gcWithSynth,
      canadabuysCsv: readFileSync(path.join(FIX, "canadabuys_open_tenders_sample.csv"), "utf8"),
      nsTenderCsv: readFileSync(path.join(FIX, "ns_surplus_tender_sample.csv"), "utf8"),
      nsRealCsv: readFileSync(path.join(FIX, "ns_surplus_real_property_sample.csv"), "utf8"),
    },
  });
  await db.exec("RESET ROLE");
  console.log("[mock-supabase] seed:", results.map((r) => `${r.feed_key}=${r.status}/${r.rows_upserted}`).join(" "));
  // Make every seeded row look a day old, so alert tests can add "new" rows deterministically.
  await db.exec(`update public.price_history_lots set first_seen_at = now() - interval '1 day'; update public.tender_notices set first_seen_at = now() - interval '1 day';`);
  return db;
}

/** Minimal service-role write client used only for seeding through the real ingest code. */
function pgClient(db: Db) {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return {
    from(table: string) {
      return {
        async upsert(rows: any, opts?: { onConflict?: string }) {
          const list = Array.isArray(rows) ? rows : [rows];
          try {
            for (const r of list) {
              const cols = Object.keys(r);
              const conflict = (opts?.onConflict || "id").split(",").map((c) => c.trim());
              const upd = cols.filter((c) => !conflict.includes(c) && c !== "first_seen_at").map((c) => `${q(c)}=EXCLUDED.${q(c)}`).join(",");
              await db.query(`INSERT INTO public.${q(table)} (${cols.map(q).join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")}) ON CONFLICT (${conflict.map(q).join(",")}) DO ${upd ? `UPDATE SET ${upd}` : "NOTHING"}`, cols.map((c) => param(r[c])));
            }
            return { error: null, count: list.length };
          } catch (e) {
            return { error: { message: (e as Error).message }, count: null };
          }
        },
        async insert(r: any) {
          try {
            const cols = Object.keys(r);
            await db.query(`INSERT INTO public.${q(table)} (${cols.map(q).join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")})`, cols.map((c) => param(r[c])));
            return { error: null };
          } catch (e) {
            return { error: { message: (e as Error).message } };
          }
        },
      };
    },
  };
}

async function handleRest(db: Db, req: http.IncomingMessage, res: http.ServerResponse, url: URL, claims: Record<string, any>) {
  const role = claims.role === "service_role" ? "service_role" : claims.role === "authenticated" ? "authenticated" : "anon";
  const uid = role === "authenticated" ? String(claims.sub) : null;
  const table = decodeURIComponent(url.pathname.replace(/^\/rest\/v1\//, ""));
  if (table.startsWith("rpc/")) return send(res, 404, { code: "PGRST202", message: "rpc not supported by the e2e mock" });
  const t = `public.${ident(table)}`;
  const sp = url.searchParams;
  const prefer = String(req.headers["prefer"] || "");
  const wantObject = String(req.headers["accept"] || "").includes("vnd.pgrst.object");
  const params: unknown[] = [];
  const method = req.method || "GET";
  try {
    const sel = selectList(sp.get("select"));
    const out = await asRole(db, role, uid, claims, async (tx) => {
      if (method === "GET" || method === "HEAD") {
        const where = whereClause(sp, params);
        const limit = sp.get("limit") ? ` LIMIT ${Number(sp.get("limit"))}` : "";
        const offset = sp.get("offset") ? ` OFFSET ${Number(sp.get("offset"))}` : "";
        const r = method === "HEAD" ? { rows: [], fields: [] } : await tx.query(`SELECT ${sel} FROM ${t}${where}${orderClause(sp.get("order"))}${limit}${offset}`, params);
        let count: number | null = null;
        if (/count=(exact|planned|estimated)/.test(prefer)) count = Number((await tx.query(`SELECT count(*)::int n FROM ${t}${where}`, params)).rows[0].n);
        return { status: 200, rows: toJsonRows(r as any), count, offset: Number(sp.get("offset") || 0) };
      }
      const body = await readBody(req);
      const returning = prefer.includes("return=representation") ? ` RETURNING ${sel}` : "";
      if (method === "POST") {
        const list: any[] = Array.isArray(body) ? body : [body];
        const conflict = sp.get("on_conflict");
        const resolution = prefer.match(/resolution=(merge|ignore)-duplicates/)?.[1];
        const rows: any[] = [];
        for (const r of list) {
          const cols = Object.keys(r);
          const ps: unknown[] = cols.map((c) => param(r[c]));
          let sql = `INSERT INTO ${t} (${cols.map(ident).join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")})`;
          if (resolution) {
            const ccols = (conflict || "id").split(",").map((c) => ident(c.trim()));
            const upd = cols.filter((c) => !ccols.includes(`"${c}"`)).map((c) => `${ident(c)}=EXCLUDED.${ident(c)}`);
            sql += ` ON CONFLICT (${ccols.join(",")}) DO ${resolution === "ignore" || !upd.length ? "NOTHING" : `UPDATE SET ${upd.join(",")}`}`;
          }
          const rr = await tx.query(sql + returning, ps);
          rows.push(...toJsonRows(rr as any));
        }
        return { status: 201, rows: returning ? rows : null, count: null, offset: 0 };
      }
      if (method === "PATCH") {
        const cols = Object.keys(body || {});
        const ps: unknown[] = cols.map((c) => param(body[c]));
        const where = whereClause(sp, ps);
        const rr = await tx.query(`UPDATE ${t} SET ${cols.map((c, i) => `${ident(c)}=$${i + 1}`).join(",")}${where}${returning}`, ps);
        return { status: returning ? 200 : 204, rows: returning ? toJsonRows(rr as any) : null, count: null, offset: 0 };
      }
      if (method === "DELETE") {
        const where = whereClause(sp, params);
        const rr = await tx.query(`DELETE FROM ${t}${where}${returning}`, params);
        return { status: returning ? 200 : 204, rows: returning ? toJsonRows(rr as any) : null, count: null, offset: 0 };
      }
      throw Object.assign(new Error("method not allowed"), { status: 405 });
    });
    const headers: Record<string, string> = {};
    const n = out.rows?.length ?? 0;
    headers["Content-Range"] = `${n ? `${out.offset}-${out.offset + n - 1}` : "*"}/${out.count ?? "*"}`;
    if (wantObject) {
      if (n !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${n} rows`, hint: null });
      return send(res, out.status === 201 ? 201 : 200, out.rows![0], headers);
    }
    if (out.rows === null) return send(res, out.status, undefined, headers);
    return send(res, out.status, method === "HEAD" ? undefined : out.rows, headers);
  } catch (e) {
    const { status, body } = pgError(e);
    if (status >= 500 || (e as any)?.code === "PGRST100") console.error(`[mock-supabase] ${method} ${url.pathname}${url.search} -> ${status} ${body.message}`);
    return send(res, status, body);
  }
}

export async function startMock(port = PORT) {
  const db = await buildDb();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    if (req.method === "OPTIONS") return send(res, 204);
    const bearer = String(req.headers["authorization"] || "").replace(/^Bearer\s+/i, "") || String(req.headers["apikey"] || "");
    const claims = verifyJwt(bearer);
    try {
      if (url.pathname === "/auth/v1/user" && req.method === "GET") {
        if (!claims?.sub) return send(res, 401, { code: 401, msg: "invalid JWT" });
        const u = (await serial(() => db.query(`select id::text, email from auth.users where id=$1`, [claims.sub]))).rows[0];
        return u ? send(res, 200, userJson(u)) : send(res, 404, { msg: "User not found" });
      }
      if (url.pathname === "/auth/v1/token" && req.method === "POST") {
        const body = await readBody(req);
        const uid = String(body?.refresh_token || "").replace(/^rt-/, "");
        const u = (await serial(() => db.query(`select id::text, email from auth.users where id::text=$1`, [uid]))).rows[0];
        return u ? send(res, 200, sessionFor(u)) : send(res, 400, { error: "invalid_grant" });
      }
      if (url.pathname === "/auth/v1/logout") return send(res, 204);
      if (url.pathname.startsWith("/rest/v1/")) {
        if (!claims) return send(res, 401, { code: "PGRST301", message: "JWT invalid" });
        return handleRest(db, req, res, url, claims);
      }
      // ---- test-only helpers (local mock; no equivalent exists on a real project) ----
      if (url.pathname === "/__test/session") {
        const who = (url.searchParams.get("user") || "member") as keyof typeof USERS;
        return send(res, 200, { session: sessionFor(USERS[who]), anon: ANON_KEY });
      }
      if (url.pathname === "/__test/new-lot" && req.method === "POST") {
        const b = await readBody(req);
        const r = await serial(() =>
          db.query(
            `insert into public.price_history_lots(external_id,feed_key,title,sold_amount,closing_date,city,province,source_url,licence_id,first_seen_at,last_seen_at)
             values ($1,'gcsurplus_sold',$2,$3,current_date,'Ottawa','ON','https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4','ogl-canada',now(),now()) returning id`,
            [`e2e-${crypto.randomUUID()}`, String(b?.title || "Pickup truck e2e"), Number(b?.sold_amount || 15500)]
          )
        );
        return send(res, 201, r.rows[0]);
      }
      if (url.pathname === "/__test/pii-scan") {
        // Every text value in every public table, scanned for the synthetic staff contacts.
        const hits: string[] = [];
        const tabs = (await serial(() => db.query(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`))).rows;
        for (const { table_name } of tabs) {
          const rows = (await serial(() => db.query(`select row_to_json(x)::text j from public."${table_name}" x`))).rows;
          for (const { j } of rows) for (const s of SYNTHETIC_STAFF) if (j.includes(s)) hits.push(`${table_name}: ${s}`);
        }
        const cols = (await serial(() => db.query(`select table_name||'.'||column_name c from information_schema.columns where table_schema='public' and column_name ~* '(custodian|sales_person|sales_email|person_nm|person_phn|contact_(name|email|phone))'`))).rows.map((r: any) => r.c);
        const lots = (await serial(() => db.query(`select count(*)::int n from public.price_history_lots`))).rows[0].n;
        return send(res, 200, { hits, staff_columns: cols, lots });
      }
      return send(res, 404, { message: `mock: no route ${req.method} ${url.pathname}` });
    } catch (e) {
      const { status, body } = pgError(e);
      return send(res, status, body);
    }
  });
  await new Promise<void>((r) => server.listen(port, "127.0.0.1", () => r()));
  console.log(`[mock-supabase] listening on http://127.0.0.1:${port}`);
  return server;
}

export const E2E_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${PORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  CRON_SECRET: "e2e-cron-secret",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3217",
  NEXT_PUBLIC_APP_URL: "http://localhost:3217",
  NEXT_TELEMETRY_DISABLED: "1",
};
if (process.argv.includes("--print-env")) {
  for (const [k, v] of Object.entries(E2E_ENV)) console.log(`export ${k}='${v}'`);
  process.exit(0);
}
if (process.argv[1] && process.argv[1].endsWith("mock-supabase.ts")) {
  startMock().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
