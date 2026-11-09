/**
 * Unit tests for search planning, lot kinds and the "typical range" guard.
 * Titles below are real GCSurplus titles (OGL–Canada). Run: npm run test:search
 */
import { readFileSync } from "fs";
import path from "path";
import { assessHomogeneity, classifyTitle, cleanTerm, kindFilters, planSearch, plannedOrFilter, RE_SRC, titleMatches, tokenVariants, type LotKind } from "../lib/opendata/search";
import { kindFacets, lotHref, parseLotParams } from "../lib/opendata/lotParams";

let n = 0;
function assert(cond: unknown, msg: string) {
  n++;
  if (!cond) throw new Error("FAIL: " + msg);
}
const eqSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// --- spelling variants and synonyms
assert(eqSet(tokenVariants("f150"), ["f150", "f-150", "f 150"]), "f150 variants");
assert(eqSet(tokenVariants("f-150"), ["f-150", "f150", "f 150"]), "f-150 variants");
for (const q of ["pickup", "pick-up", "pick up", "Pick Up", "PICKUPS"]) {
  const p = planSearch(q);
  assert(p.groups.length === 1 && p.groups[0]!.includes("pick-up") && p.groups[0]!.includes("pickup") && p.groups[0]!.includes("pick up"), `${q}: pickup spellings`);
  assert(p.groups[0]!.includes("f-150") && p.groups[0]!.includes("silverado"), `${q}: pickup models from the data`);
  assert(p.vehicleIntent, `${q}: vehicle intent`);
}
assert(JSON.stringify(planSearch("F-150").groups) === JSON.stringify(planSearch("f150").groups), "F-150 == f150");
assert(JSON.stringify(planSearch("f 150").groups) === JSON.stringify(planSearch("F150").groups), "f 150 == F150");
assert(planSearch("ford f150").groups.length === 2 && planSearch("ford f150").vehicleIntent, "two tokens AND, vehicle intent");
assert(!planSearch("generator").vehicleIntent && !planSearch("laptop").vehicleIntent, "no vehicle intent for generator/laptop");
assert(planSearch("generator").groups[0]!.includes("genset"), "generator ~ genset");
assert(planSearch("fork lift").groups[0]!.includes("forklift"), "fork lift -> forklift");
assert(planSearch("truck").expandedWith.includes("silverado"), "truck also matches pickup models (honest note)");

// --- injection safety: no PostgREST syntax survives
assert(cleanTerm('a,b) or(title.eq."x"') === "a b or title.eq. x", "cleanTerm strips , ( ) quotes");
const logic = plannedOrFilter(planSearch('truck"),id.gt.0,(x'))!;
assert(!/[)(],?id\.gt/.test(logic.replace(/title\.ilike\."[^"]*"/g, "")), "no injected clause outside quoted values");
assert(/^and\(or\(title\.ilike\."%[^"]+%"/.test(plannedOrFilter(planSearch("ford f150"))!), "multi-token logic tree");

// --- kinds from titles
const K: Array<[string, LotKind]> = [
  ["2015 Chevrolet Silverado 1500 Work Truck Long Box 2WD", "vehicle"],
  ["2016 Ford F-150 XLT SuperCrew 6.5-ft. Bed 4WD", "vehicle"],
  ["2011 Ford Ranger XLT SuperCab 4-Door 4WD", "vehicle"],
  ["2001 Western Star Dump Truck", "vehicle"],
  ["2016 RAM 1500 Tradesman Quad Cab 4WD", "vehicle"],
  ["Small Metal Truck Box", "part"],
  ["Arrow Truck Canopy", "part"],
  ["BT LHM230 Hand Pallet Truck", "part"],
  ["2022 Ford F-250 Front Bumper", "part"],
  ["2023 Ram 2500 Front Bumpers", "part"],
  ["2019 Ford F-150 Centre Consoles", "part"],
  ["2020 Ram 2500 Tailgate", "part"],
  ["2023 Ford Expedition Rear Cargo Storage", "part"],
  ["2017 Chevrolet Express 2500 Cargo Extended", "vehicle"],
  ["2013 Ford F-150 XL 2WD (Sold for Parts)", "part"],
  ["Generator - Sold for Parts", "part"],
  ["Laptop Bags", "part"],
  ["11 Laptop Cases", "part"],
  ["Honda EZ3500 Portable Generator", "other"],
  ["Dell Latitude 5480 Laptop", "other"],
  ["2018 Polaris Sportsman 570 ATV", "powersport"],
  ["2012 John Deere 5085M Tractor", "equipment"],
  ["2008 Haulmark Cargo Trailer", "trailer"],
  ["Generator Trailer", "trailer"],
];
for (const [t, k] of K) assert(classifyTitle(t) === k, `classify "${t}" -> ${k} (got ${classifyTitle(t)})`);

// JS regex == the pattern sent to Postgres: every kindFilters() list reproduces classifyTitle()
for (const [t] of K) {
  const kinds = (["vehicle", "powersport", "equipment", "trailer", "part", "other"] as LotKind[]).filter((k) =>
    kindFilters(k).every((f) => (f.op === "imatch") === new RegExp(f.pattern, "i").test(t))
  );
  assert(kinds.length === 1 && kinds[0] === classifyTitle(t), `exactly one kind filter matches "${t}" (${kinds.join(",")})`);
}
for (const src of Object.values(RE_SRC)) assert(!/\\b|\(\?<|\\m|\\M/.test(src), "portable regex (no \\b, lookbehind, \\m)");

// --- typical range guard on the real-title fixture
const fx = JSON.parse(readFileSync(path.join(process.cwd(), "fixtures/open-data/search_relevance_sample.json"), "utf8")).rows as Array<{ title: string; sold_amount: number }>;
const match = (q: string) => fx.filter((r) => titleMatches(planSearch(q), r.title));
const truckAll = match("truck");
const truckVeh = truckAll.filter((r) => classifyTitle(r.title) === "vehicle");
assert(!assessHomogeneity(truckAll).ok && assessHomogeneity(truckAll).reason === "mixed_kinds", "truck (all kinds) is mixed -> no range");
assert(assessHomogeneity(truckVeh).ok, "truck (cars & trucks) -> range ok");
assert(truckVeh.every((r) => !/canopy|pallet|truck box|tool box|console|bumper/i.test(r.title)), "truck vehicles exclude parts");
assert(match("pickup").length === match("pick-up").length && match("pick up").length === match("pickup").length, "pickup spellings same matches");
assert(match("pickup").filter((r) => classifyTitle(r.title) === "vehicle").length >= 20, "pickup finds pickup models although titles rarely say pickup");
assert(match("f150").length === match("F-150").length && match("f150").length > 0, "f150 == F-150 matches");
const gen = match("generator");
assert(assessHomogeneity(gen).reason === "mixed_kinds", "generator: sold-for-parts mixed in -> narrow note");
assert(assessHomogeneity(gen.filter((r) => classifyTitle(r.title) === "other")).ok, "generator, parts excluded -> range ok");
assert(assessHomogeneity(match("laptop")).reason === "mixed_kinds", "laptop: bags mixed in -> narrow note");
assert(assessHomogeneity(fx.slice(0, 5)).reason === "too_few", "too few");
const wide = Array.from({ length: 30 }, (_, i) => ({ title: "Honda Generator", sold_amount: i < 15 ? 10 : 5000 }));
assert(assessHomogeneity(wide).reason === "wide_spread", "same kind but 500x spread -> narrow note");

// --- facets and params
const f = kindFacets(truckAll);
assert(f[0]!.kind === "vehicle" && f.some((x) => x.kind === "part"), "facets ordered, include parts");
const p = parseLotParams({ q: "truck" });
assert(p.kind === "vehicle" && p.kindIsDefault, "truck defaults to cars & trucks");
assert(parseLotParams({ q: "truck", kind: "all" }).kind === null, "kind=all turns default off");
assert(parseLotParams({ q: "laptop" }).kind === null, "laptop no default kind");
assert(parseLotParams({ kind: "drop table" }).kindParam === null, "unknown kind ignored");
const pp = parseLotParams({ q: "x", min: "900", max: "100", from: "2024-13-40", to: "2025-01-31", province: "zz", page: "-3" });
assert(pp.minPrice === 100 && pp.maxPrice === 900 && pp.from === null && pp.to === "2025-01-31" && pp.province === null && pp.page === 1, "param cleaning");
assert(lotHref("/search", p, { page: "2" }) === "/search?q=truck&page=2", "href keeps q, default kind not written");
assert(lotHref("/search", p, { kind: "part" }) === "/search?q=truck&kind=part", "href with kind");

console.log(`search tests: ${n} assertions passed`);
