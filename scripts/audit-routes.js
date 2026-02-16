#!/usr/bin/env node
/**
 * audit:routes - Prints route inventory (pages and APIs).
 * Run: npm run audit:routes
 */
const fs = require("fs");
const path = require("path");

function find(dir, ext) {
  const r = [];
  if (!fs.existsSync(dir)) return r;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules") {
      r.push(...find(p, ext));
    } else if (e.name.endsWith(ext)) {
      r.push(p);
    }
  }
  return r;
}

const pages = find("app", "page.tsx")
  .map((p) => p.replace(/\\/g, "/").replace("app/", "/").replace("/page.tsx", ""))
  .sort();

const apis = find("app/api", "route.ts")
  .map((p) => p.replace(/\\/g, "/").replace("app", "").replace("/route.ts", ""))
  .sort();

console.log("Pages:");
pages.forEach((p) => console.log("  ", p || "/"));
console.log("\nAPIs:");
apis.forEach((a) => console.log("  ", a || "/api"));
