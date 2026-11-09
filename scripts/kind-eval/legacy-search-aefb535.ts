// Verbatim copy of lib/opendata/search.ts at aefb535 (the classifier before the odd-items work), kept only so
// scripts/kind-eval/accuracy.ts can score 'before' vs 'after' on the same labelled rows. Not used by the app.
/**
 * Search planning and lot classification for the sold-lot pages (/search, /comps, /price-history).
 *
 * The open-data files have no item category column, so "kind" comes from title heuristics that
 * were checked against the loaded GCSurplus + Nova Scotia data (Nov 9, 2026 load):
 *  - a road vehicle title starts with a model year and a make, e.g. "2015 Chevrolet Silverado 1500";
 *    the makes listed are the ones that appear in that position in the data;
 *  - parts and accessories are recognised by words such as cover, mirror, tire, cap, canopy, parts.
 * Every regex here is written to behave the same in JavaScript and in Postgres (~*), so the same
 * pattern filters rows in the database and classifies rows in tests. No lookbehind, no \b.
 */

const W0 = "(^|[^a-z0-9])"; // word start (portable)
const W1 = "([^a-z0-9]|$)"; // word end (portable)
const words = (list: string[]) => `${W0}(${list.join("|")})${W1}`;

/** Makes seen right after a model year in titles (road vehicles). */
export const ROAD_MAKES = [
  "ford", "chevrolet", "chevy", "dodge", "ram", "gmc", "nissan", "hyundai", "toyota", "jeep", "subaru", "honda",
  "mitsubishi", "chrysler", "sterling", "volkswagen", "kia", "international", "mazda", "mercedes-benz", "mercedes",
  "bmw", "mercury", "freightliner", "volvo", "suzuki", "audi", "buick", "kenworth", "western star", "pontiac",
  "cadillac", "lincoln", "peterbilt", "mack", "hino", "isuzu", "tesla", "fiat", "acura", "lexus", "infiniti", "mini",
];
/** Makes seen after a model year that are snowmobiles, ATVs, side-by-sides, boats or outboards. */
export const POWERSPORT_MAKES = [
  "polaris", "arctic cat", "artic cat", "yamaha", "ski-doo", "skidoo", "bombardier", "can-am", "kawasaki", "argo",
  "evinrude", "mercury marine", "princecraft", "lund", "harley-davidson",
];
/** Makes seen after a model year that are tractors and construction equipment. */
export const EQUIPMENT_MAKES = ["john deere", "kubota", "bobcat", "case", "caterpillar", "cat", "new holland", "massey ferguson", "jcb", "komatsu", "toro", "cub cadet"];
/** Trailer makes seen after a model year. */
export const TRAILER_MAKES = ["manac", "haulmark", "karavan", "remeq", "tremcar", "highliner", "kanter", "penman", "pace american", "royal cargo", "triton"];

/** Pickup models present in the data (titles rarely say "pickup"). */
export const PICKUP_MODELS = [
  "f-150", "f150", "f-250", "f250", "f-350", "f350", "silverado", "sierra", "ram 1500", "ram 2500", "ram 3500",
  "tacoma", "tundra", "colorado", "canyon", "ranger", "frontier", "titan", "dakota", "ridgeline", "gladiator",
];

/** Words that mark a part, accessory or a non-vehicle "truck" (hand truck, pallet truck, toy). */
export const PART_WORDS = [
  "cover", "covers", "tonneau", "mirror", "mirrors", "tire", "tires", "tyre", "tyres", "rim", "rims", "wheel", "wheels",
  "part", "parts", "toy", "toys", "hand truck", "hand trucks", "pallet truck", "basket truck", "dolly", "jack", "cap", "caps",
  "canopy", "bed slide", "accessory", "accessories", "mat", "mats", "rack", "racks", "ladder", "hitch", "bumper", "seat",
  "seats", "headlight", "headlights", "battery", "batteries", "liner", "console", "consoles", "grille",
  "fender", "charger", "chargers", "adapter", "adapters", "bag", "bags", "sleeve", "sleeves", "dock", "docking station",
  "cable", "cables", "mount", "case", "cases", "storage box", "tool box", "toolbox", "truck box", "cylinder", "decal",
  "decals", "manual", "manuals", "model kit", "replica", "scrap", "engine", "transmission", "lift truck", "truck lift", "hydraulic lift", "lift kit", "kit", "cart", "drawer", "lock", "tailgate", "seating", "cargo storage", "cargo compartment", "cargo box", "cargo boxes", "pump", "suitcase", "knapsack", "briefcase", "holster", "strap",
];

const YEAR = "^(19|20)[0-9]{2}[ ]+";
export const RE_SRC = {
  road: `${YEAR}(${ROAD_MAKES.join("|")})${W1}`,
  powersport: `${YEAR}(${POWERSPORT_MAKES.join("|")})${W1}`,
  equipment: `${YEAR}(${EQUIPMENT_MAKES.join("|")})${W1}`,
  trailer: `${YEAR}(${TRAILER_MAKES.join("|")})${W1}|${W0}trailers?${W1}`,
  // "door" only when not "4-Door" (a body style).
  part: `${W0}(${PART_WORDS.join("|")})s?${W1}|(^|[^a-z0-9-])doors?${W1}`,
} as const;

export type LotKind = "vehicle" | "powersport" | "equipment" | "trailer" | "part" | "other";
export const KIND_LABEL: Record<LotKind, string> = {
  vehicle: "Cars & trucks",
  powersport: "ATVs, snowmobiles & boats",
  equipment: "Tractors & heavy equipment",
  trailer: "Trailers",
  part: "Parts, accessories & for-parts lots",
  other: "Other items",
};
export const FILTERABLE_KINDS: LotKind[] = ["vehicle", "powersport", "equipment", "trailer", "part", "other"];

const RX = Object.fromEntries(Object.entries(RE_SRC).map(([k, v]) => [k, new RegExp(v, "i")])) as Record<keyof typeof RE_SRC, RegExp>;

/** Kind of one lot from its title. Year+make wins unless the title names a part ("2020 Ford F-250 Center Consoles"). */
export function classifyTitle(title: string): LotKind {
  const t = (title || "").trim();
  const part = RX.part.test(t);
  if (!part) {
    if (RX.road.test(t)) return "vehicle";
    if (RX.powersport.test(t)) return "powersport";
    if (RX.equipment.test(t)) return "equipment";
  }
  if (RX.trailer.test(t) && !part) return "trailer";
  if (part) return "part";
  return "other";
}

/**
 * PostgREST filters for one kind. They mirror classifyTitle() exactly, so a facet count computed
 * in JS equals the row count the database returns for that kind.
 */
export function kindFilters(kind: LotKind): Array<{ op: "imatch" | "not.imatch"; pattern: string }> {
  const not = (k: keyof typeof RE_SRC) => ({ op: "not.imatch" as const, pattern: RE_SRC[k] });
  const is = (k: keyof typeof RE_SRC) => ({ op: "imatch" as const, pattern: RE_SRC[k] });
  switch (kind) {
    case "vehicle":
      return [is("road"), not("part")];
    case "powersport":
      return [is("powersport"), not("part"), not("road")];
    case "equipment":
      return [is("equipment"), not("part"), not("road"), not("powersport")];
    case "trailer":
      return [is("trailer"), not("part"), not("road"), not("powersport"), not("equipment")];
    case "part":
      return [is("part")];
    case "other":
      return [not("road"), not("powersport"), not("equipment"), not("trailer"), not("part")];
  }
}

export function cleanKind(k?: string | null): LotKind | null {
  return (FILTERABLE_KINDS as string[]).includes(k || "") ? (k as LotKind) : null;
}

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

export type SearchPlan = {
  /** Each group must match (AND); any variant within a group may match (OR). */
  groups: string[][];
  /** The query looks like it is about road vehicles. */
  vehicleIntent: boolean;
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
  for (const t of toks) {
    const variants = new Set<string>(tokenVariants(t));
    const syn = SYNONYMS[t];
    if (syn) for (const v of syn) {
      if (!variants.has(v) && !tokenVariants(t).includes(v) && !/^pick/.test(v) && v !== t) expanded.push(v);
      variants.add(v);
    }
    if (VEHICLE_WORDS.has(t) || ROAD_MAKES.includes(t) || PICKUP_MODELS.includes(t) || PICKUP_MODELS.includes(t.replace(/^([a-z])([0-9])/, "$1-$2"))) vehicleIntent = true;
    groups.push([...variants]);
  }
  return { groups, vehicleIntent, expandedWith: [...new Set(expanded)], cleaned };
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

export function assessHomogeneity(rows: Array<{ title: string; sold_amount: number | null }>): Homogeneity {
  const xs = rows.filter((r) => typeof r.sold_amount === "number" && Number.isFinite(r.sold_amount) && r.sold_amount > 0);
  const kinds: Partial<Record<LotKind, number>> = {};
  for (const r of xs) {
    const k = classifyTitle(r.title);
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
