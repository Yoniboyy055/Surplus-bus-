#!/usr/bin/env node
// Keeps vercel.json, docs/CRON_PLAN.md and the cron route handlers in agreement.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const crons = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")).crons || [];
const plan = readFileSync(join(root, "docs/CRON_PLAN.md"), "utf8");
const errors = [];
const seen = new Set();

for (const c of crons) {
  const path = c.path.split("?")[0];
  seen.add(path);
  const file = join(root, "app", path, "route.ts");
  if (!existsSync(file)) {
    errors.push(`${c.path}: no route at app${path}/route.ts`);
    continue;
  }
  const src = readFileSync(file, "utf8");
  if (!/isAuthorizedCron\(/.test(src)) errors.push(`${c.path}: route does not call isAuthorizedCron`);
  const planKey = path.replace(/^\/api\//, "");
  if (!plan.includes(planKey)) errors.push(`${c.path}: not described in docs/CRON_PLAN.md`);
  if (!/^[\d*,\-/]+ [\d*,\-/]+ [\d*,\-/]+ [\d*,\-/]+ [\d*,\-/]+$/.test(c.schedule)) errors.push(`${c.path}: bad schedule ${c.schedule}`);
}

const cronDir = join(root, "app/api/cron");
for (const d of existsSync(cronDir) ? readdirSync(cronDir) : []) {
  if (!seen.has(`/api/cron/${d}`)) errors.push(`/api/cron/${d}: route exists but is not scheduled in vercel.json`);
}

if (errors.length) {
  console.error("check:crons FAILED\n" + errors.map((e) => " - " + e).join("\n"));
  process.exit(1);
}
console.log(`check:crons OK (${crons.length} crons)`);
