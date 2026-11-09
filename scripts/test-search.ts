/**
 * Unit tests for search planning, lot kinds and the "typical range" guard.
 * Titles below are real GCSurplus titles (OGL–Canada). Run: npm run test:search
 */
import { readFileSync } from "fs";
import path from "path";
import { assessHomogeneity, cleanTerm, planSearch, plannedOrFilter, titleMatches, tokenVariants } from "../lib/opendata/search";
import { classifyLot, classifyTitle, FILTERABLE_KINDS, kindLogic, kindNode, KIND_RULES, overrideFor, ruleKind, SIGNALS, type LotKind, type LotLike } from "../lib/opendata/kinds";
import { excludeOutliers, quantityLot } from "../lib/opendata/outliers";
import { lotLogic } from "../lib/opendata/queries";
import { readOverrides, renderGenerated } from "./build-kind-overrides";
import { lotReportInput } from "../lib/opendata/lotReports";
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

// --- kinds from titles (real titles from the Nov 9 load)
const K: Array<[string, LotKind]> = [
  ["2015 Chevrolet Silverado 1500 Work Truck Long Box 2WD", "vehicle"],
  ["2016 Ford F-150 XLT SuperCrew 6.5-ft. Bed 4WD", "vehicle"],
  ["2011 Ford Ranger XLT SuperCab 4-Door 4WD", "vehicle"],
  ["2016 RAM 1500 Tradesman Quad Cab 4WD", "vehicle"],
  ["2016 Chevrolet Silverado 3500HD", "vehicle"],
  ["2013 RAM 3500 Diesel HD with Leer Canopy", "vehicle"],
  ["2012 RAM 1500 Regular Cab with Canopy and Bed Slide", "vehicle"],
  ["2017 Chevrolet Express 2500 Cargo Extended", "vehicle"],
  // pickups vs medium/heavy trucks
  ["2001 Western Star Dump Truck", "heavy_truck"],
  ["2012 Ford F-450 SD Regular Cab DRW 2WD", "heavy_truck"],
  ["2012 Ford F-550 (63,887 KM)", "heavy_truck"],
  ["2009 Dodge Ram 4500 Quad Cab 4WD", "heavy_truck"],
  ["2005 Sterling Acterra 3-Ton Cargo Truck", "heavy_truck"],
  ["2014 MCI J4500 Highway Cruiser Bus", "heavy_truck"],
  ["2016 Volvo VNL", "heavy_truck"],
  ["2015 International Terrastar 5-Ton Mobile Service Truck", "heavy_truck"],
  // parts and accessories
  ["Small Metal Truck Box", "part"],
  ["Arrow Truck Canopy", "part"],
  ["2022 Ford F-250 Front Bumper", "part"],
  ["2023 Ram 2500 Front Bumpers", "part"],
  ["2019 Ford F-150 Centre Consoles", "part"],
  ["2020 Ram 2500 Tailgate", "part"],
  ["2023 Ford Expedition Rear Cargo Storage", "part"],
  ["Tacoma 2014 2WD Carpet Floor Mats", "part"],
  ["Market Fertilizer Auger Attachment for Dump Truck", "part"],
  ["2018 Ford Transit Tow Hitch Receiver", "part"],
  ["Front Bumper 2025 Chevrolet Silverado 3500", "part"],
  ["Targus DEFCNCL Laptop Locks", "part"],
  ["Boat Propeller", "part"],
  ["Evinrude G2 E-TEC 175HP Boat Cowling Kits", "part"],
  ["Laptop Bags", "part"],
  ["Laptop Carrying Cases", "part"],
  ["Toshiba Laptop Bag", "part"],
  ["Eagletronic MTL-2 SR4803-MTL2 Fork Lift Battery Charger", "part"],
  ["HP Laserjet Black Toner Cartridge", "part"],
  // for parts / scrap
  ["2013 Ford F-150 XL 2WD (Sold for Parts)", "part"],
  ["Generator - Sold for Parts", "part"],
  ["Biomedical Freezer - Parts Only", "part"],
  ["Tandem Axle Boat Trailer (Sold for Scrap only)", "part"],
  // bulk, mixed and scrap lots
  ["Lot of 12 Laptop Bags", "bulk"],
  ["Assorted Laptop Bags", "bulk"],
  ["9 Various Laptops", "bulk"],
  ["13 Dynabook Laptops", "bulk"],
  ["Scrap Brass (Empty Ammunition)", "bulk"],
  ["Lot of Scrap Metal", "bulk"],
  ["Three Bookcases", "bulk"],
  ["Nikon Lens Hood Lot", "bulk"],
  ["Pallets of Office Paper", "bulk"],
  ["Mixed Textiles", "bulk"],
  // a leading number that is a size, not a count
  ["3 kW Gas Generator", "equipment"],
  ["4-Drawer Filing Cabinet", "other"],
  ["Office Chairs - Lot 2", "other"],
  // computers / lab gear vs power generators
  ["Dell Latitude 5480 Laptop", "electronics"],
  ["Dell 5414 Rugged Laptop Computer", "electronics"],
  ["Hewlett Packard 8640B Signal Generator", "electronics"],
  ["Pulse Generator", "electronics"],
  ["Peak NM32L Nitrogen Generator", "electronics"],
  ["Wavetek Arbitrary Waveform Generator", "electronics"],
  ["Honda EZ3500 Portable Generator", "equipment"],
  ["Homelite 3 kW Gasoline Generator", "equipment"],
  ["Welder/Generator", "equipment"],
  ["Steam Generator", "other"],
  // boats, trailers, powersport
  ["Zodiac H300 Inflatable Boat", "powersport"],
  ["Crestliner Aluminum Boat with EZ Loader Trailer", "powersport"],
  ["14' Lund Boat, Motor and Trailer", "powersport"],
  ["Echo Sailboat", "powersport"],
  ["Mercury 90 HP Outboard Jet Motor", "powersport"],
  ["2021 Mercury 30ELHPT Outboard Motor", "powersport"],
  ["2018 Polaris Sportsman 570 ATV", "powersport"],
  ["Arctic Cat Bearcat 570 XT", "powersport"],
  ["Highliner CL17-17 Boat Trailer", "trailer"],
  ["2008 ATTC Trail Mate Double Snowmobile Trailer", "trailer"],
  ["2014 Sterling Utility Trailer", "trailer"],
  ["2008 Haulmark Cargo Trailer", "trailer"],
  ["Generator Trailer", "trailer"],
  ["2012 John Deere 5085M Tractor", "equipment"],
  ["2015 Honda WB30XT Water Pump", "equipment"],
  ["2014 Bobcat 20 Dollar Coins", "other"],
];
for (const [t, k] of K) assert(classifyTitle(t) === k, `classify "${t}" -> ${k} (got ${classifyTitle(t)}, rule ${ruleKind({ title: t }).rule})`);
assert(classifyLot({ title: "Conveyance of Surplus Land 0.24 Hectares", kind: "real_property" }) === "property", "NS real property from the feed's kind column");

// The database filter is the same rule list: evaluate each kind's tree in JS and check exactly one kind matches.
type N = ReturnType<typeof kindNode>;
const RX = Object.fromEntries(Object.entries(SIGNALS).map(([k, v]) => [k, new RegExp(v, "i")]));
function evalNode(n: N, row: LotLike): boolean {
  if (n.t === "cond") {
    const v = n.c.sig === "realProperty" ? row.kind === "real_property" : RX[n.c.sig]!.test(row.title.trim());
    return n.c.neg ? !v : v;
  }
  if (n.t === "ids") {
    const hit = row.feed_key === n.feed && n.ids.includes(row.external_id || "");
    return n.neg ? !hit : hit;
  }
  return n.t === "and" ? n.kids.every((k) => evalNode(k, row)) : n.kids.some((k) => evalNode(k, row));
}
const labelled = JSON.parse(readFileSync(path.join(process.cwd(), "fixtures/open-data/kind_labels.json"), "utf8")).rows as Array<LotLike & { label: LotKind; set: string }>;
const treeRows: LotLike[] = [...K.map(([t]) => ({ title: t })), ...labelled, { title: "2020 Ford F-450 Front Bumper with Tow Hooks", feed_key: "gcsurplus_sold", external_id: "gcs-R5OT0021340" }];
for (const row of treeRows) {
  const hits = FILTERABLE_KINDS.filter((k) => evalNode(kindNode(k), row));
  assert(hits.length === 1 && hits[0] === classifyLot(row), `exactly one kind tree matches "${row.title}" (${hits.join(",")} vs ${classifyLot(row)})`);
}
for (const src of Object.values(SIGNALS)) assert(!/\\b|\(\?<|\(\?=|\(\?!|\\m|\\M|\\d|\\s|\\w/.test(src), "portable regex (no \\b, lookaround, \\d/\\s/\\w)");
for (const src of Object.values(SIGNALS)) assert(!src.includes('"') && !src.includes("\\"), "regex needs no quoting inside PostgREST values");
// URL budget: Supabase's gateway rejects requests around 16 KB, and PostgREST echoes the query back in a
// Content-Location header. Each kind tree alone stays under 9.5 KB encoded; the worst search we allow
// (6 tokens, the two largest synonym groups) plus a kind stays under 12 KB.
for (const k of FILTERABLE_KINDS) {
  const len = encodeURIComponent(kindLogic(k)).length;
  assert(len < 9500, `kind ${k}: encoded tree ${len} chars < 9500`);
  const worst = new URLSearchParams({ or: `(${lotLogic({ q: "pickup truck f150 f250 silverado ram", kind: k })})` }).toString().length;
  assert(worst < 12000, `kind ${k}: worst search + kind ${worst} chars < 12000`);
}
assert(lotLogic({ q: "truck", kind: "vehicle" })!.startsWith("and(or(title.ilike."), "search + kind in one logic tree");
assert(lotLogic({ q: "truck" })!.startsWith("or(title.ilike."), "search only");
assert(lotLogic({ kind: "property" })!.startsWith("and(kind.eq.real_property,"), "property uses the feed column (minus overridden rows)");
assert(KIND_RULES.every((r) => r.why.length > 5), "every rule says why");

// --- hand overrides (data/kind_overrides.csv)
const ov = readOverrides();
assert(renderGenerated(ov) === readFileSync(path.join(process.cwd(), "lib/opendata/kindOverrides.generated.ts"), "utf8"), "generated overrides in sync with the CSV (run scripts/build-kind-overrides.ts)");
const bumper = { title: "2020 Ford F-450 Front Bumper with Tow Hooks", feed_key: "gcsurplus_sold", external_id: "gcs-R5OT0021340" };
assert(ruleKind(bumper).kind === "heavy_truck" && classifyLot(bumper) === "part", "override turns the bumper into a part (rules alone say truck)");
assert(classifyLot({ ...bumper, external_id: "gcs-OTHER" }) === "heavy_truck", "override applies to that row only");
assert(overrideFor({ title: "x", feed_key: "ns_surplus", external_id: "fba4b60b0445baced241a50f0d916493" })?.hideFromComps === true, "hide_from_comps override");
let threw = false;
try { readOverrides("feed_key,external_id,kind,reason\ngcsurplus_sold,gcs-1,spaceship,because\n"); } catch { threw = true; }
assert(threw, "unknown kind in CSV is rejected");
threw = false;
try { readOverrides("feed_key,external_id,kind,reason\ngcsurplus_sold,gcs-1,part,ok ok\ngcsurplus_sold,gcs-1,part,dupe dupe\n"); } catch { threw = true; }
assert(threw, "duplicate row in CSV is rejected");

// --- labelled sample: rules must stay at least this good (see scripts/kind-eval/accuracy.ts)
const wrongIn = (set: string) => labelled.filter((r) => r.set === set && ruleKind(r).kind !== r.label).length;
assert(wrongIn("dev") <= 6, `dev set: ${wrongIn("dev")}/240 wrong (<= 6)`);
assert(wrongIn("holdout") <= 27, `holdout set: ${wrongIn("holdout")}/200 wrong (<= 27)`);

// --- outliers
assert(quantityLot("Quantity: 9(set(s)) : - Make: Delta") && quantityLot("Quantity: 1(lot(s)) : - Quantity: 18 - Manufacturer: Valcom"), "quantity lots");
assert(!quantityLot("Quantity: 1(each) : - Make: Raycon") && !quantityLot("Quantity: 1(lot(s)) : - Make: Brahmin") && !quantityLot(null), "single items are not quantity lots");
assert(quantityLot("Quantity: 1(pallet(s)) : Office paper"), "sold by the pallet");
const base = Array.from({ length: 30 }, (_, i) => ({ title: "Honda EU2000i Generator", sold_amount: 400 + i * 10 }));
const res = excludeOutliers([
  ...base,
  { title: "Honda Generator", sold_amount: 1 },
  { title: "Honda Generator", sold_amount: 0 },
  { title: "Lot of 5 Honda Generators", sold_amount: 2000 },
  { title: "Honda Generator", sold_amount: 600, category: "Quantity: 3(each) : - Make: Honda" },
  { title: "Honda Generator", sold_amount: 90000 },
  { title: "Honda Generator", sold_amount: 5 },
  { title: "Request for Proposal", sold_amount: 48000, kind: "public_tender" },
  { title: "Disposal", sold_amount: 70, feed_key: "ns_surplus", external_id: "fba4b60b0445baced241a50f0d916493" },
  { title: "Honda Generator", sold_amount: null },
]);
assert(res.excluded.nominal === 2 && res.excluded.bulk === 2 && res.excluded.extreme === 2 && res.excluded.contract === 1 && res.excluded.manual === 1, `outlier reasons ${JSON.stringify(res.excluded)}`);
assert(res.kept.length === 30 && res.excludedTotal === 8, "kept 30, left out 8; null price ignored");
assert(excludeOutliers(base.slice(0, 5)).fences === null, "no fences under 8 rows");

// --- report input: no personal data
assert(lotReportInput.safeParse({ feed_key: "gcsurplus_sold", external_id: "gcs-R5OT0021340", reason: "wrong_kind", suggested_kind: "part" }).success, "valid report");
assert(!lotReportInput.safeParse({ feed_key: "gcsurplus_sold", external_id: "gcs-1", reason: "other", note: "call me at 613-555-0199" }).success, "phone number in note refused");
assert(!lotReportInput.safeParse({ feed_key: "gcsurplus_sold", external_id: "gcs-1", reason: "other", note: "me@example.com" }).success, "email in note refused");
assert(!lotReportInput.safeParse({ feed_key: "x", external_id: "gcs-1", reason: "other" }).success, "unknown feed refused");
assert(!lotReportInput.safeParse({ feed_key: "gcsurplus_sold", external_id: "a,b)", reason: "other" }).success, "odd id refused");
assert(!lotReportInput.safeParse({ feed_key: "gcsurplus_sold", external_id: "gcs-1", reason: "other", note: "x".repeat(501) }).success, "note capped at 500");

// --- typical range guard on the real-title fixture
const fx = JSON.parse(readFileSync(path.join(process.cwd(), "fixtures/open-data/search_relevance_sample.json"), "utf8")).rows as Array<{ title: string; sold_amount: number }>;
const match = (q: string) => fx.filter((r) => titleMatches(planSearch(q), r.title));
const truckAll = match("truck");
const truckVeh = truckAll.filter((r) => classifyLot(r) === "vehicle");
assert(!assessHomogeneity(truckAll).ok && assessHomogeneity(truckAll).reason === "mixed_kinds", "truck (all kinds) is mixed -> no range");
assert(assessHomogeneity(truckVeh).ok, "truck (cars & trucks) -> range ok");
assert(truckVeh.every((r) => !/canopy|pallet|truck box|tool box|console|bumper/i.test(r.title)), "truck vehicles exclude parts");
assert(match("pickup").length === match("pick-up").length && match("pick up").length === match("pickup").length, "pickup spellings same matches");
assert(match("pickup").filter((r) => classifyLot(r) === "vehicle").length >= 20, "pickup finds pickup models although titles rarely say pickup");
assert(match("f150").length === match("F-150").length && match("f150").length > 0, "f150 == F-150 matches");
const gen = match("generator");
assert(assessHomogeneity(gen).reason === "mixed_kinds", "generator: sold-for-parts mixed in -> narrow note");
assert(gen.some((r) => classifyLot(r) === "electronics") && gen.some((r) => classifyLot(r) === "equipment"), "generator: lab generators and power generators split");
assert(assessHomogeneity(match("laptop")).reason === "mixed_kinds", "laptop: bags mixed in -> narrow note");
assert(assessHomogeneity(fx.slice(0, 5)).reason === "too_few", "too few");
const wide = Array.from({ length: 30 }, (_, i) => ({ title: "Honda Generator", sold_amount: i < 15 ? 10 : 5000 }));
assert(assessHomogeneity(wide).reason === "wide_spread", "same kind but 500x spread -> narrow note");

// --- facets and params
const f = kindFacets(truckAll);
assert(f[0]!.kind === "vehicle" && f.some((x) => x.kind === "part"), "facets ordered, include parts");
const p = parseLotParams({ q: "truck" });
assert(p.kind === "vehicle" && p.kindIsDefault, "truck defaults to cars, pickups & vans");
assert(parseLotParams({ q: "dump truck" }).kind === "heavy_truck" && parseLotParams({ q: "F-550" }).kind === "heavy_truck" && parseLotParams({ q: "freightliner" }).kind === "heavy_truck", "heavy truck searches default to heavy trucks");
assert(parseLotParams({ q: "x", outliers: "all" }).outliers === "all" && parseLotParams({ q: "x", outliers: "1" }).outliers === null, "outliers param");
assert(parseLotParams({ q: "truck", kind: "all" }).kind === null, "kind=all turns default off");
assert(parseLotParams({ q: "laptop" }).kind === null, "laptop no default kind");
assert(parseLotParams({ kind: "drop table" }).kindParam === null, "unknown kind ignored");
const pp = parseLotParams({ q: "x", min: "900", max: "100", from: "2024-13-40", to: "2025-01-31", province: "zz", page: "-3" });
assert(pp.minPrice === 100 && pp.maxPrice === 900 && pp.from === null && pp.to === "2025-01-31" && pp.province === null && pp.page === 1, "param cleaning");
assert(lotHref("/search", p, { page: "2" }) === "/search?q=truck&page=2", "href keeps q, default kind not written");
assert(lotHref("/search", p, { kind: "part" }) === "/search?q=truck&kind=part", "href with kind");

console.log(`search tests: ${n} assertions passed`);
