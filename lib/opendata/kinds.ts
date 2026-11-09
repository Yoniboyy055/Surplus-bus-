/**
 * Lot kinds for the sold-lot pages (/search, /comps, /price-history).
 *
 * The open-data files have no item-category column, so a lot's kind comes from
 * (a) the feed's own `kind` column where it means something (Nova Scotia "real_property"),
 * (b) ordered title rules, checked against all 85,217 loaded rows (Nov 9, 2026 load), and
 * (c) a hand-maintained override list (data/kind_overrides.csv) for single rows the rules get wrong.
 *
 * The rules are data, not code paths: the same rule list is evaluated in JS (facets, ranges, tests)
 * and rendered to one PostgREST logic tree (database filtering), so both always agree.
 * Every regex is portable between JavaScript and Postgres `~*` (no \b, no lookbehind).
 */
import { KIND_OVERRIDES } from "./kindOverrides.generated";

const W0 = "(^|[^a-z0-9])"; // word start (portable)
const W1 = "([^a-z0-9]|$)"; // word end (portable)
/** The word is the head of the phrase: followed by end, punctuation or a joining word. */
const HEAD = "s?[ ]*($|[-,(#:;&+/]|[ ](with|and|for|from|lot|lots|x|no)([^a-z]|$))";
const YEAR = "^(19|20)[0-9]{2}[ ,]+";
const alt = (xs: string[]) => `(${xs.join("|")})`;

/** Makes seen right after a model year in titles (road vehicles). */
export const ROAD_MAKES = [
  "ford", "chevrolet", "chevy", "dodge", "ram", "gmc", "nissan", "hyundai", "toyota", "jeep", "subaru", "honda",
  "mitsubishi", "chrysler", "volkswagen", "kia", "mazda", "mercedes-benz", "mercedes", "bmw", "mercury", "volvo",
  "suzuki", "audi", "buick", "pontiac", "cadillac", "lincoln", "tesla", "fiat", "acura", "lexus", "infiniti", "mini", "saturn", "land rover",
];
/** Medium/heavy truck and bus makes seen after a model year. */
export const HEAVY_MAKES = ["international", "navistar", "sterling", "western star", "freightliner", "kenworth", "peterbilt", "mack", "hino", "isuzu", "mci", "blue bird", "setra", "prevost"];
/** Makes seen after a model year that are snowmobiles, ATVs, side-by-sides, boats or outboards. */
export const POWERSPORT_MAKES = [
  "polaris", "arctic cat", "artic cat", "yamaha", "ski-doo", "skidoo", "bombardier", "brp", "can-am", "kawasaki", "argo",
  "evinrude", "mercury marine", "princecraft", "lund", "harley-davidson", "ktm", "ducati", "zodiac", "harbercraft", "crestliner", "kanter",
];
/** Makes seen after a model year that are tractors and construction equipment. */
export const EQUIPMENT_MAKES = ["john deere", "kubota", "bobcat", "case", "caterpillar", "cat", "new holland", "massey ferguson", "jcb", "komatsu", "toro", "cub cadet", "doosan", "genie", "wacker neuson", "raymond"];
/** Trailer makes seen after a model year. */
export const TRAILER_MAKES = ["manac", "haulmark", "karavan", "remeq", "tremcar", "highliner", "penman", "pace american", "royal cargo", "triton", "ez loader", "ez-loader", "shorelander", "load rite", "dew eng"];

/** Pickup models present in the data (titles rarely say "pickup"). */
export const PICKUP_MODELS = [
  "f-150", "f150", "f-250", "f250", "f-350", "f350", "silverado", "sierra", "ram 1500", "ram 2500", "ram 3500",
  "tacoma", "tundra", "colorado", "canyon", "ranger", "frontier", "titan", "dakota", "ridgeline", "gladiator",
];

/** Head nouns that make a lot a part or an accessory (only when they are the thing being sold). */
export const PART_WORDS = [
  "part", "accessory", "accessories", "cover", "mirror", "tire", "rim", "wheel", "hubcap", "toy",
  "hand truck", "pallet truck", "dolly", "dollies", "truck cap", "canopy", "canopies", "bed slide", "mat", "rack", "hitch", "hitch mount",
  "bumper", "seat", "seating", "headlight", "taillight", "battery", "batteries", "liner", "console", "grille", "fender",
  "charger", "adapter", "bag", "sleeve", "dock", "docking station", "cable", "mount", "case", "carry case", "carrying case",
  "storage box", "tool box", "toolbox", "truck box", "decal", "manual", "model kit", "engine", "transmission",
  "tailgate", "cargo storage", "cargo compartment", "cargo box", "cargo boxe", "propeller", "anchor", "oar",
  "cartridge", "toner", "attachment", "push bar", "liftgate", "tarp", "tarpaulin", "storage boxe", "truck boxe", "tool boxe", "hitche", "trailer jack", "mirror kit", "cowling", "cowling kit", "helm pump", "windlass", "navigation light", "boat lift", "boat window", "boat tank", "sonar", "strap", "holster", "knapsack", "backpack", "suitcase", "door", "windshield",
  "hitch receiver", "receiver hitch", "receiver bar", "sled deck", "door panel", "laptop lock", "cable lock",
];
/** Things that are computers, electronics or lab/test instruments (head noun anywhere in the title). */
export const ELECTRONICS_WORDS = [
  "laptop", "notebook computer", "computer", "desktop computer", "macbook", "ipad", "tablet", "iphone", "smartphone",
  "cell phone", "monitor", "printer", "server", "oscilloscope", "multimeter", "analy[sz]er", "power supply", "power supplies",
  "projector", "camera", "camera lens", "lens", "television", "tv", "radio", "transceiver", "receiver", "amplifier", "headphone",
  "earbuds", "headset", "microscope", "centrifuge", "thermocycler", "spectrometer", "spectrophotometer", "incubator", "autoclave",
  "recirculator", "chromatograph", "pipette", "drone", "gps", "scanner", "time clock", "wireless system", "router", "laboratory",
  "(signal|function|pulse|sweep|waveform|noise|arbitrary|synthesized|synthesizer|frequency|voltage controlled|delay|pattern|rf|microwave|tracking|nitrogen|hydrogen|zero air|ozone|tone|test|video|lab water) generator", "generator (signal|tester|detector|counter)",
];
/** Machinery head nouns (tractors and heavy equipment, generators, pumps). */
export const EQUIPMENT_WORDS = [
  "generator", "generator set", "welder/generator", "generator/welder", "forklift", "fork lift", "backhoe", "excavator",
  "loader", "skid steer", "grader", "tractor", "telehandler", "mower", "lawnmower", "lawn mower", "snowblower", "snow blower",
  "water pump", "trash pump", "light tower", "combine", "pressure washer", "boom lift", "scissor lift", "zamboni", "sweeper",
];

const PS_WORDS = ["bearcat", "skandic", "ski-doo", "skidoo", "sea-doo", "snowmobile", "snowmachine", "snow machine", "sled", "atv", "utv", "side-by-side", "side by side", "all-terrain vehicle", "motorcycle", "dirt bike", "outboard motor", "outboard"];
const MARINE_WORDS = ["outboard", "outboard motor", "outboard engine", "sea-doo", "jet ski", "personal watercraft"];
const MARINE_HEAD = ["boat", "sailboat", "workboat", "riverboat", "pontoon", "canoe", "kayak", "rhib", "rigid hull inflatable", "inflatable boat", "zodiac", "dinghy", "raft"];

/** Regex signals (all case-insensitive, portable). */
export const SIGNALS = {
  /** Sold for parts, scrap or destruction. */
  forParts: `${W0}(for|4)[ ]+(parts|scrap|recycling|destruction|salvage)${W1}|${W0}parts[ ]+only${W1}|${W0}for[ ]+repairs?[ ]+or[ ]+parts${W1}`,
  /** A lot of several or mixed items. */
  bulkWords:
    `${W0}(lots?[ ]+of|assorted|assortment|various|variety[ ]+of|miscellaneous|misc|mixed|bulk|pallets?[ ]+of|skids?[ ]+of|box(es)?[ ]+of|cases?[ ]+of|bins?[ ]+of|bags?[ ]+of|sets?[ ]+of|pairs?[ ]+of|scrap[ ]+metal|period[ ]+contract)${W1}` +
    `|^(scrap|two|three|four|five|six|seven|eight|nine|ten|twelve|dozen)${W1}|[ ]lots?[ ]*$`,
  /** Starts with a count of 2-999 items ("6 Office Chairs")... */
  leadingCount: "^([2-9]|[1-9][0-9]|[1-9][0-9][0-9])[ ]+(x[ ]+)?[a-z]",
  /** ...unless the number is a size or spec ("3 kW Generator", "10 Ton Jack"). */
  countIsUnit:
    "^[0-9]+[ ]+(x[ ]+)?(kw|kva|hp|ton|ft|foot|feet|in|inch|mm|m|l|gallon|w|v|volt|amp|lb|drawer|door|seater|piece|gb|port|tier|light|person|wheel|step|compartment|panel|level|row|liter|litre|oz|point|ct)([^a-z0-9]|$)",
  /** ...or right before a model year ("Front Bumper 2025 Chevrolet Silverado"). */
  partHead: `${W0}${alt(PART_WORDS)}(${HEAD}|s?[ ]+(19|20)[0-9]{2}[ ])`,
  /** Coins, banknotes and stamps (a "2014 Bobcat" can be a coin). */
  collectible: `${W0}(coins?|banknotes?|bank[ ]+notes?|stamps?|medallions?|steam[ ]+generators?|steambath[ ]+generators?)${W1}`,
  /** "2016 RAM 2500 with Leer Canopy": in model-year titles, what follows "with" is fitted to the vehicle. */
  yearWith: "^(19|20)[0-9]{2}[ ,].*[ ](with|w/|c/w)[ ]",
  marine: `${W0}${alt(MARINE_HEAD)}s?[ ]*($|[-,(&]|[ ](and|with|w/|motor|package|#)([^a-z]|$))|${W0}(sailboat|workboat|riverboat|whaleboat|rowboat|pontoon|canoe|kayak|rhib|rigid[ ]+hull[ ]+inflatable|inflatable[ ]+boat)s?${W1}|${W0}${alt(MARINE_WORDS)}s?${W1}`,
  trailer: `${W0}(semi-?)?trailers?[ ]*($|[-,(#:;&]|[ ](with|and|w/|for|lot)([^a-z]|$))|${YEAR}${alt(TRAILER_MAKES)}${W1}`,
  heavy:
    `${YEAR}${alt(HEAVY_MAKES)}${W1}|${YEAR}volvo[ ]+(vn|tractor|truck)` +
    `|${YEAR}.*${W0}(f-?[4-7]50|e-?450|[cgkt]?[4-8]500(hd)?|cutaway|cube[ ]+van|[35]-ton|chassis[ ]+cab|cab[ ]+(and|&)[ ]+chassis|bus|medium[ ]+duty)${W1}` +
    `|${W0}(dump|bucket|boom|fire|plow|tow|garbage|refuse|service|cargo|line|stake|flatbed|crane|vacuum|water|sewer)[ ]+truck${W1}|${W0}(truck[ ]+tractor|tractor[ ]+truck|school[ ]+bus)${W1}`,
  road: `${YEAR}${alt(ROAD_MAKES)}${W1}`,
  powersport: `${YEAR}${alt(POWERSPORT_MAKES)}${W1}|${W0}${alt(PS_WORDS)}s?${W1}`,
  equipmentMake: `${YEAR}${alt(EQUIPMENT_MAKES)}${W1}`,
  electronics: `${W0}${alt(ELECTRONICS_WORDS)}(s|es)?${W1}`,
  equipmentHead: `${W0}${alt(EQUIPMENT_WORDS)}${HEAD}|${W0}(generators?|gensets?)${W1}`,
} as const;
export type SignalKey = keyof typeof SIGNALS;

export type LotKind = "vehicle" | "heavy_truck" | "powersport" | "equipment" | "trailer" | "electronics" | "property" | "part" | "bulk" | "other";
export const KIND_LABEL: Record<LotKind, string> = {
  vehicle: "Cars, pickups & vans",
  heavy_truck: "Medium & heavy trucks, buses",
  powersport: "Boats, ATVs & snowmobiles",
  equipment: "Tractors, machinery & generators",
  trailer: "Trailers",
  electronics: "Computers, electronics & lab gear",
  property: "Land & buildings",
  part: "Parts, accessories & for-parts lots",
  bulk: "Bulk, mixed & scrap lots",
  other: "Other items",
};
export const FILTERABLE_KINDS: LotKind[] = ["vehicle", "heavy_truck", "powersport", "equipment", "trailer", "electronics", "property", "part", "bulk", "other"];

type Cond = { sig: SignalKey | "realProperty"; neg?: boolean };
type Rule = { kind: LotKind; all: Cond[]; why: string };
const is = (sig: Cond["sig"]): Cond => ({ sig });
const not = (sig: Cond["sig"]): Cond => ({ sig, neg: true });

/** First matching rule wins. Order matters; every step was checked against the loaded data. */
export const KIND_RULES: Rule[] = [
  { kind: "property", all: [is("realProperty")], why: "feed marks it as real property" },
  { kind: "part", all: [is("forParts")], why: "sold for parts / scrap / destruction" },
  { kind: "bulk", all: [is("bulkWords")], why: "lot of / assorted / various / scrap metal" },
  { kind: "bulk", all: [is("leadingCount"), not("countIsUnit")], why: "starts with an item count" },
  { kind: "part", all: [is("partHead"), not("yearWith")], why: "a part or accessory is the thing sold" },
  { kind: "other", all: [is("collectible")], why: "coins, banknotes, stamps; steam generators are not power generators" },
  { kind: "powersport", all: [is("marine")], why: "a boat (with or without motor/trailer)" },
  { kind: "trailer", all: [is("trailer")], why: "a trailer is the thing sold" },
  { kind: "heavy_truck", all: [is("heavy")], why: "medium/heavy truck make, class 4+ model or body" },
  { kind: "vehicle", all: [is("road"), not("equipmentHead")], why: "model year + car/pickup/van make" },
  { kind: "powersport", all: [is("powersport")], why: "snowmobile / ATV / outboard make or word" },
  { kind: "equipment", all: [is("equipmentMake")], why: "model year + tractor/equipment make" },
  { kind: "electronics", all: [is("electronics")], why: "computer, electronics or lab instrument" },
  { kind: "equipment", all: [is("equipmentHead")], why: "generator, tractor, loader, mower, pump..." },
];

const RX = Object.fromEntries(Object.entries(SIGNALS).map(([k, v]) => [k, new RegExp(v, "i")])) as Record<SignalKey, RegExp>;

export type LotLike = { title: string; kind?: string | null; feed_key?: string | null; external_id?: string | null };

function testCond(c: Cond, row: LotLike): boolean {
  const v = c.sig === "realProperty" ? row.kind === "real_property" : RX[c.sig].test((row.title || "").trim());
  return c.neg ? !v : v;
}

/** Kind from the rules only (no overrides). */
export function ruleKind(row: LotLike): { kind: LotKind; rule: number } {
  for (let i = 0; i < KIND_RULES.length; i++) if (KIND_RULES[i]!.all.every((c) => testCond(c, row))) return { kind: KIND_RULES[i]!.kind, rule: i };
  return { kind: "other", rule: -1 };
}

export type Override = { kind: LotKind | null; hideFromComps: boolean; reason: string };
const overrideKey = (feed: string, id: string) => `${feed}|${id}`;
const OVERRIDES = new Map<string, Override>(KIND_OVERRIDES.map((o) => [overrideKey(o.feed_key, o.external_id), { kind: o.kind, hideFromComps: o.hide_from_comps, reason: o.reason }]));
export function overrideFor(row: LotLike): Override | null {
  return row.feed_key && row.external_id ? OVERRIDES.get(overrideKey(row.feed_key, row.external_id)) ?? null : null;
}

/** A lot's kind: override first, then the rules. */
export function classifyLot(row: LotLike): LotKind {
  return overrideFor(row)?.kind ?? ruleKind(row).kind;
}
/** Title-only classification (no feed kind, no overrides). */
export function classifyTitle(title: string): LotKind {
  return ruleKind({ title }).kind;
}

// ---------------------------------------------------------------------------------------------
// Rendering the same rules as a PostgREST logic tree (NULL-safe, negations pushed down).
// ---------------------------------------------------------------------------------------------
type Node = { t: "cond"; c: Cond } | { t: "and" | "or"; kids: Node[] } | { t: "ids"; neg: boolean; feed: string; ids: string[] };

const negate = (n: Node): Node =>
  n.t === "cond" ? { t: "cond", c: { ...n.c, neg: !n.c.neg } } : n.t === "ids" ? { ...n, neg: !n.neg } : { t: n.t === "and" ? "or" : "and", kids: n.kids.map(negate) };
const ruleNode = (r: Rule): Node => (r.all.length === 1 ? { t: "cond", c: r.all[0]! } : { t: "and", kids: r.all.map((c) => ({ t: "cond", c }) as Node) });

function overriddenIds(filter?: (o: (typeof KIND_OVERRIDES)[number]) => boolean): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const o of KIND_OVERRIDES) if (o.kind && (!filter || filter(o))) m.set(o.feed_key, [...(m.get(o.feed_key) || []), o.external_id]);
  return m;
}

/**
 * Boolean tree "this row's kind is K", built as a decision list so every rule appears once:
 *   f(i) = rule_i OR f(i+1)        when rule i gives K
 *   f(i) = NOT rule_i AND f(i+1)   otherwise
 * (and f(end) = true only for "other").
 */
export function kindNode(kind: LotKind): Node {
  const last = kind === "other" ? KIND_RULES.length : KIND_RULES.map((r) => r.kind).lastIndexOf(kind) + 1;
  let tail: Node | null = null;
  for (let i = last - 1; i >= 0; i--) {
    const r = KIND_RULES[i]!;
    const here = r.kind === kind ? ruleNode(r) : negate(ruleNode(r));
    if (tail == null) { tail = here; continue; }
    const op = r.kind === kind ? "or" : "and";
    tail = tail.t === op ? { t: op, kids: [here, ...(tail as { kids: Node[] }).kids] } : { t: op, kids: [here, tail] };
  }
  let byRules: Node = tail ?? { t: "cond", c: { sig: "realProperty", neg: true } };
  // Overrides: rows with a kind override leave the rule result; rows overridden to K join it.
  const all = overriddenIds();
  if (all.size) {
    const notOverridden: Node[] = [...all].map(([feed, ids]) => ({ t: "ids", neg: true, feed, ids }));
    byRules = { t: "and", kids: [byRules, ...notOverridden] };
    const toK = [...overriddenIds((o) => o.kind === kind)].map(([feed, ids]) => ({ t: "ids", neg: false, feed, ids }) as Node);
    if (toK.length) byRules = { t: "or", kids: [byRules, ...toK] };
  }
  return byRules;
}

const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
/** Render a node as a PostgREST logic-tree term. */
export function renderPostgrest(n: Node): string {
  if (n.t === "cond") {
    if (n.c.sig === "realProperty") return n.c.neg ? "or(kind.is.null,kind.neq.real_property)" : "kind.eq.real_property";
    return `title.${n.c.neg ? "not." : ""}imatch.${q(SIGNALS[n.c.sig])}`;
  }
  if (n.t === "ids") {
    const list = `(${n.ids.map(q).join(",")})`;
    return n.neg ? `or(feed_key.neq.${n.feed},external_id.not.in.${list})` : `and(feed_key.eq.${n.feed},external_id.in.${list})`;
  }
  return `${n.t}(${n.kids.map(renderPostgrest).join(",")})`;
}
/** Render a node as SQL (parity checks in PGlite). Pushes params. */
export function renderSql(n: Node, params: unknown[]): string {
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (n.t === "cond") {
    if (n.c.sig === "realProperty") return n.c.neg ? "(kind is null or kind <> 'real_property')" : "(kind = 'real_property')";
    return `(${n.c.neg ? "not " : ""}(title ~* ${p(SIGNALS[n.c.sig])}))`;
  }
  if (n.t === "ids") return n.neg ? `(feed_key <> ${p(n.feed)} or external_id <> all(${p(n.ids)}))` : `(feed_key = ${p(n.feed)} and external_id = any(${p(n.ids)}))`;
  return `(${n.kids.map((k) => renderSql(k, params)).join(n.t === "and" ? " and " : " or ")})`;
}
/** PostgREST term for "kind is K". */
export function kindLogic(kind: LotKind): string {
  return renderPostgrest(kindNode(kind));
}

export function cleanKind(k?: string | null): LotKind | null {
  return (FILTERABLE_KINDS as string[]).includes(k || "") ? (k as LotKind) : null;
}
