/**
 * Misclassification rate of the lot-kind rules on hand-labelled rows (fixtures/open-data/kind_labels.json),
 * before (classifier at aefb535) and after (lib/opendata/kinds.ts), per set (dev / holdout).
 *
 * The old classifier had 6 kinds, so "before" is scored generously: a label it could not express counts as
 * correct when the old answer was the nearest old kind (heavy_truck -> vehicle; electronics, property -> other;
 * bulk -> other or part). "after" is scored on the exact new kind, rules only (no hand overrides), and again
 * with data/kind_overrides.csv applied. Run: npx tsx scripts/kind-eval/accuracy.ts [--json]
 */
import { readFileSync } from "fs";
import path from "path";
import { classifyTitle as legacyClassify } from "./legacy-search-aefb535";
import { classifyLot, ruleKind } from "../../lib/opendata/kinds";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
type Row = { set: "dev" | "holdout"; stratum: string; feed_key: string; external_id: string; kind: string | null; title: string; label: string };
const rows = JSON.parse(readFileSync(path.join(ROOT, "fixtures/open-data/kind_labels.json"), "utf8")).rows as Row[];

const legacyOk = (label: string, got: string) => {
  if (label === got) return true;
  if (label === "heavy_truck") return got === "vehicle";
  if (label === "electronics" || label === "property") return got === "other";
  if (label === "bulk") return got === "other" || got === "part";
  return false;
};

/** After's kinds folded back into the old 6 kinds, so both are scored with the same leniency. */
const foldDown = (k: string) => (k === "heavy_truck" ? "vehicle" : k === "electronics" || k === "property" || k === "bulk" ? "other" : k);

export function score() {
  const out: Record<string, { n: number; before: number; afterRules: number; afterWithOverrides: number; afterFolded: number }> = {};
  const wrong: Record<string, string[]> = {};
  for (const r of rows) {
    for (const set of [r.set, "all", `${r.set}:${r.stratum === "random" ? "random" : "search results"}`]) {
      const s = (out[set] ||= { n: 0, before: 0, afterRules: 0, afterWithOverrides: 0, afterFolded: 0 });
      s.n++;
      if (!legacyOk(r.label, legacyClassify(r.title))) s.before++;
      const rk = ruleKind(r).kind;
      if (!legacyOk(r.label, foldDown(rk))) s.afterFolded++;
      if (rk !== r.label) {
        s.afterRules++;
        if (set === r.set) (wrong[set] ||= []).push(`want ${r.label}, got ${rk}: ${r.title.slice(0, 90)}`);
      }
      if (classifyLot(r) !== r.label) s.afterWithOverrides++;
    }
  }
  return { out, wrong };
}

if (process.argv[1] && /accuracy/.test(process.argv[1])) {
  const { out, wrong } = score();
  if (process.argv.includes("--json")) console.log(JSON.stringify({ out, wrong }, null, 1));
  else {
    const pct = (a: number, n: number) => `${a}/${n} (${((100 * a) / n).toFixed(1)}%)`;
    console.log("set                    | rows | BEFORE (aefb535, 6 kinds, lenient) | AFTER folded to 6 kinds, same leniency | AFTER exact 10 kinds, rules only | AFTER exact + overrides");
    for (const [k, s] of Object.entries(out)) console.log(`${k.padEnd(22)} | ${String(s.n).padStart(4)} | ${pct(s.before, s.n).padEnd(34)} | ${pct(s.afterFolded, s.n).padEnd(38)} | ${pct(s.afterRules, s.n).padEnd(32)} | ${pct(s.afterWithOverrides, s.n)}`);
    for (const [k, w] of Object.entries(wrong)) console.log(`\nstill wrong (${k}, rules only):\n  ` + w.join("\n  "));
  }
}
