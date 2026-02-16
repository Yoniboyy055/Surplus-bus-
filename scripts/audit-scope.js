#!/usr/bin/env node
/**
 * audit:scope - Fails if out-of-scope marketplace strings found in app code.
 * Run: npm run audit:scope
 */
const fs = require("fs");
const path = require("path");

const DIRS = ["app", "components", "lib", "middleware.ts"];
const BAD_TERMS = [
  "/buyer",
  "/referrer",
  "deals",
  "payouts",
  "commission",
  "escrow",
  "marketplace",
];

const EXCLUDE = [
  "node_modules",
  ".next",
  "docs",
  "scripts",
  "docs__legacy",
];

let found = [];

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!e.name.startsWith(".") && !EXCLUDE.includes(e.name)) scan(p);
    } else if (/\.(tsx?|jsx?|json)$/.test(e.name)) {
      const c = fs.readFileSync(p, "utf8");
      for (const b of BAD_TERMS) {
        if (c.includes(b)) found.push({ file: p, term: b });
      }
    }
  }
}

for (const d of DIRS) {
  if (!fs.existsSync(d)) continue;
  if (fs.statSync(d).isDirectory()) {
    scan(d);
  } else {
    const c = fs.readFileSync(d, "utf8");
    for (const b of BAD_TERMS) {
      if (c.includes(b)) found.push({ file: d, term: b });
    }
  }
}

if (found.length) {
  console.error("audit:scope FAILED - out-of-scope strings found:");
  found.forEach((f) => console.error(`  ${f.file}: ${f.term}`));
  process.exit(1);
}

console.log("audit:scope OK");
