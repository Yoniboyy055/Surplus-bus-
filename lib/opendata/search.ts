/**
 * Search planning and the "typical range" guard for the sold-lot pages (/search, /comps, /price-history).
 * Lot kinds (cars, heavy trucks, parts, bulk lots...) live in ./kinds.ts.
 */

import { classifyLot, HEAVY_MAKES, PICKUP_MODELS, ROAD_MAKES, type LotKind, type LotLike } from "./kinds";

export { classifyLot, classifyTitle, cleanKind, FILTERABLE_KINDS, KIND_LABEL, kindLogic, PICKUP_MODELS, ROAD_MAKES } from "./kinds";
export type { LotKind } from "./kinds";

/** Strip PostgREST / LIKE syntax from user text. */
export function cleanTerm(s: string): string {
  return s.toLowerCase().replace(/[%_*,()\\"'`:;]/g, " ").replace(/\s+/g, " ").trim();
}

/** Spelling variants for one token: f150 / f-150 / f 150, pick-up / pickup / pick up. */
export function tokenVariants(tok: string): string[] {
  const out = new Set<string>([tok]);
  const m = tok.match(/^([a-z]+)[- ]?([0-9]+[a-z]*)$/);
  if (m) {
    out.add(`${m[1]}${m[2]}`);
    out.add(`${m[1]}-${m[2]}`);
    out.add(`${m[1]} ${m[2]}`);
  }
  if (tok.includes("-")) {
    out.add(tok.replace(/-/g, ""));
    out.add(tok.replace(/-/g, " "));
  }
  return [...out].filter((v) => v.length >= 2);
}

/** Known synonyms (all present in the data) keyed by a normalised token. */
const SYNONYMS: Record<string, string[]> = {
  pickup: ["pickup", "pick-up", "pick up", ...PICKUP_MODELS],
  pickups: ["pickup", "pick-up", "pick up", ...PICKUP_MODELS],
  truck: ["truck", ...PICKUP_MODELS],
  trucks: ["truck", ...PICKUP_MODELS],
  forklift: ["forklift", "fork lift", "fork-lift"],
  lawnmower: ["lawnmower", "lawn mower"],
  mower: ["mower"],
  skidsteer: ["skid steer", "skidsteer", "skid-steer"],
  ebike: ["e-bike", "ebike", "electric bike"],
  laptop: ["laptop", "notebook computer"],
  laptops: ["laptop", "notebook computer"],
  generator: ["generator", "genset"],
  generators: ["generator", "genset"],
  snowmobile: ["snowmobile", "snow mobile", "ski-doo", "skidoo"],
  atv: ["atv", "quad"],
  "side-by-side": ["side by side", "side-by-side", "utv"],
};
/** Multi-word phrases recognised before tokenising. */
const PHRASES: Array<[RegExp, string]> = [
  [/\bpick[- ]up(s)?\b/g, "pickup"],
  [/\bfork[- ]lift(s)?\b/g, "forklift"],
  [/\blawn[- ]mower(s)?\b/g, "lawnmower"],
  [/\bskid[- ]steer(s)?\b/g, "skidsteer"],
  [/\bside[- ]by[- ]side(s)?\b/g, "side-by-side"],
  [/\be[- ]bike(s)?\b/g, "ebike"],
  [/\bsnow[- ]mobile(s)?\b/g, "snowmobile"],
  [/\b([a-z])[- ]([0-9]{2,4})\b/g, "$1$2"], // "f 150" / "f-150" -> one token
];

const VEHICLE_WORDS = new Set(["truck", "trucks", "pickup", "pickups", "car", "cars", "van", "vans", "suv", "sedan", "minivan", "vehicle", "vehicles", "hatchback", "coupe", "wagon", "cab"]);
/** Words that mean a medium/heavy truck or bus (all seen in the data). */
const HEAVY_WORDS = new Set(["dump", "bus", "buses", "plow", "bucket", "boom", "cutaway", "cube", "tractor-trailer", "semi", "f450", "f550", "f650", "f750", "4500", "5500", "6500", "7500", "kodiak", "topkick", "acterra", "cascadia", "prostar", "durastar"]);

export type SearchPlan = {
  /** Each group must match (AND); any variant within a group may match (OR). */
  groups: string[][];
  /** The query looks like it is about road vehicles. */
  vehicleIntent: boolean;
  /** ...and specifically medium/heavy trucks or buses ("dump truck", "F-550", "Freightliner"). */
  heavyIntent: boolean;
  /** Synonyms added beyond spelling variants, for an honest "also matching" note. */
  expandedWith: string[];
  cleaned: string;
};

export function planSearch(raw: string): SearchPlan {
  let s = cleanTerm(raw).slice(0, 80);
  const cleaned = s;
  for (const [re, rep] of PHRASES) s = s.replace(re, rep);
  const toks = [...new Set(s.split(" ").filter((t) => t.length >= 2))].slice(0, 6);
  const groups: string[][] = [];
  const expanded: string[] = [];
  let vehicleIntent = false;
  let heavyIntent = false;
  for (const t of toks) {
    const variants = new Set<string>(tokenVariants(t));
    const syn = SYNONYMS[t];
    if (syn) for (const v of syn) {
      if (!variants.has(v) && !tokenVariants(t).includes(v) && !/^pick/.test(v) && v !== t) expanded.push(v);
      variants.add(v);
    }
    if (HEAVY_WORDS.has(t) || HEAVY_MAKES.includes(t)) heavyIntent = vehicleIntent = true;
    if (VEHICLE_WORDS.has(t) || ROAD_MAKES.includes(t) || PICKUP_MODELS.includes(t) || PICKUP_MODELS.includes(t.replace(/^([a-z])([0-9])/, "$1-$2"))) vehicleIntent = true;
    groups.push([...variants]);
  }
  if (/(^| )(western star|blue bird|school bus|fire truck|tow truck)( |$)/.test(s)) heavyIntent = vehicleIntent = true;
  return { groups, vehicleIntent, heavyIntent, expandedWith: [...new Set(expanded)], cleaned };
}

/** PostgREST logic tree: and(or(title.ilike."%a%",title.ilike."%b%"),or(...)). */
export function plannedOrFilter(plan: SearchPlan, column = "title"): string | null {
  if (!plan.groups.length) return null;
  const grp = (g: string[]) => `or(${g.map((v) => `${column}.ilike."%${v}%"`).join(",")})`;
  return plan.groups.length === 1 ? plan.groups[0]!.map((v) => `${column}.ilike."%${v}%"`).join(",") : `and(${plan.groups.map(grp).join(",")})`;
}

/** Same matching in JS (tests, local checks). */
export function titleMatches(plan: SearchPlan, title: string): boolean {
  const t = (title || "").toLowerCase();
  return plan.groups.every((g) => g.some((v) => t.includes(v)));
}

/** Is a set of matches homogeneous enough for a "typical sold range"? */
export const RANGE_MIN_N = 20;
export const RANGE_MIN_SHARE = 0.8;
export const RANGE_MAX_SPREAD = 25; // p75 / p25

export type Homogeneity = {
  ok: boolean;
  n: number;
  dominant: LotKind | null;
  share: number;
  spread: number | null;
  kinds: Partial<Record<LotKind, number>>;
  reason: "ok" | "too_few" | "mixed_kinds" | "wide_spread";
};

export function assessHomogeneity(rows: Array<LotLike & { sold_amount: number | null }>): Homogeneity {
  const xs = rows.filter((r) => typeof r.sold_amount === "number" && Number.isFinite(r.sold_amount) && r.sold_amount > 0);
  const kinds: Partial<Record<LotKind, number>> = {};
  for (const r of xs) {
    const k = classifyLot(r);
    kinds[k] = (kinds[k] || 0) + 1;
  }
  const n = xs.length;
  let dominant: LotKind | null = null;
  let top = 0;
  for (const [k, v] of Object.entries(kinds) as [LotKind, number][]) if (v > top) { top = v; dominant = k; }
  const share = n ? top / n : 0;
  const amounts = xs.map((r) => r.sold_amount as number).sort((a, b) => a - b);
  const q = (p: number) => amounts[Math.min(amounts.length - 1, Math.max(0, Math.round((amounts.length - 1) * p)))]!;
  const spread = n ? q(0.75) / Math.max(q(0.25), 1) : null;
  let reason: Homogeneity["reason"] = "ok";
  if (n < RANGE_MIN_N) reason = "too_few";
  else if (share < RANGE_MIN_SHARE) reason = "mixed_kinds";
  else if (spread != null && spread > RANGE_MAX_SPREAD) reason = "wide_spread";
  return { ok: reason === "ok", n, dominant, share, spread, kinds, reason };
}
