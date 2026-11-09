/** Unit tests for ECC audit L5/L6/L2 hardening. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderDiscountEmail, safeHttpsUrl } from "../lib/email/templates/discountPercent";
import { alertRuleCreate, alertRulePatch, savedOpportunity } from "../lib/account/legacyAlertSchemas";

let n = 0;
function ok(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exit(1);
  }
  n++;
}

ok(safeHttpsUrl("javascript:alert(1)", "https://x/") === "https://x/", "javascript: url rejected");
ok(safeHttpsUrl("http://evil.example/", "https://x/") === "https://x/", "http url rejected");
ok(safeHttpsUrl("https://surplus.example/p?a=1", "https://x/") === "https://surplus.example/p?a=1", "https kept");

const html = renderDiscountEmail({ subject: "s", percent_off: 10, code: "X", cta_url: 'https://a.example/"><script>', unsubscribe_url: "https://u.example/" });
const body = typeof html === "string" ? html : JSON.stringify(html);
ok(!body.includes('"><script>'), "quotes escaped in attribute");

ok(alertRuleCreate.safeParse({ category: "vehicles", channel: "email" }).success, "valid alert");
ok(!alertRuleCreate.safeParse({ category: "vehicles", channel: "email", profile_id: "x" }).success, "unknown keys rejected");
ok(!alertRuleCreate.safeParse({ category: "x".repeat(200), channel: "email" }).success, "long category rejected");
ok(!alertRulePatch.safeParse({ min_price: "1; drop" }).success, "non-number price rejected");
ok(!savedOpportunity.safeParse({ opportunity_id: "1 or 1=1" }).success, "non-uuid rejected");

// L2: client components must not import lib/env (server-only names would ship to the browser).
function walk(d: string): string[] {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? (f === "node_modules" ? [] : walk(p)) : /\.tsx?$/.test(f) ? [p] : [];
  });
}
const offenders = ["app", "components", "lib"].flatMap(walk).filter((p) => {
  const s = readFileSync(p, "utf8");
  return /^["']use client["']/m.test(s) && /from ["']@\/lib\/env["']/.test(s);
});
ok(offenders.length === 0, `client files import lib/env: ${offenders.join(", ")}`);
ok(!/lib\/env["']/.test(readFileSync("lib/supabase/client.ts", "utf8")), "browser supabase client uses env.public");

console.log(`input-hardening: ${n} OK`);
