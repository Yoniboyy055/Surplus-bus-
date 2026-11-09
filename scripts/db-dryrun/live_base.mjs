import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "fs";
const L=new URL("../../supabase/live_snapshot", import.meta.url).pathname;
export async function liveDb({quiet=false}={}) {
  const db=new PGlite({extensions:{pgcrypto}});
  const log=(...a)=>{ if(!quiet) console.log(...a); };
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE authenticator;
    CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE TABLE auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb, created_at timestamptz default now());
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ select current_user::text $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ select coalesce(nullif(current_setting('test.jwt', true),''),'{}')::jsonb $$;
    SET check_function_bodies = off;`);
  let ok=0, bad=[];
  for (const line of readFileSync(`${L}/10_tables.sql`,"utf8").split("\n").filter(Boolean)) {
    try { await db.exec(line); ok++; } catch(e) { bad.push(line.slice(0,90)+" -> "+e.message); }
  }
  // functions/views/triggers/rls/policies: split on top-level statement boundaries
  const src=readFileSync(`${L}/20_funcs_views_triggers_policies.sql`,"utf8");
  const parts=[]; let buf=""; let inDollar=null;
  for (const ln of src.split("\n")) {
    buf+=ln+"\n";
    const tags=ln.match(/\$[A-Za-z_]*\$/g)||[];
    for (const t of tags) { if (inDollar===null) inDollar=t; else if (t===inDollar) inDollar=null; }
    if (inDollar===null && /;\s*$/.test(ln)) { parts.push(buf); buf=""; }
  }
  if (buf.trim()) parts.push(buf);
  // views may depend on each other; retry loop
  let pending=parts;
  for (let pass=0; pass<4 && pending.length; pass++) {
    const next=[];
    for (const p of pending) { try { await db.exec(p); ok++; } catch(e) { next.push([p,e.message]); } }
    pending=next.map(x=>x[0]); if (pass===3) bad.push(...next.map(([p,m])=>p.trim().slice(0,110).replace(/\s+/g," ")+" -> "+m));
  }
  for (const line of readFileSync(`${L}/30_grants.sql`,"utf8").split("\n").filter(Boolean)) {
    try { await db.exec(line); } catch(e) { bad.push(line+" -> "+e.message); }
  }
  // Supabase default: functions executable by PUBLIC (anon/authenticated inherit), schema usage
  await db.exec(`GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role; GRANT SELECT ON auth.users TO service_role;`);
  // Supabase project default privileges for objects created later by postgres (matches hosted projects)
  await db.exec(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;`);
  log(`live baseline: ${ok} statements ok, ${bad.length} failed`); for (const b of bad) log("  FAIL", b);
  return db;
}
