/** URL search params <-> lot filters, shared by /search, /price-history and /comps. */
import { cleanCity, cleanDay, cleanPrice, cleanProvince, type LotFilters } from "./queries";
import { classifyLot, cleanKind, FILTERABLE_KINDS, planSearch, type LotKind } from "./search";
import type { LotLike } from "./kinds";

export type LotParams = {
  q: string;
  province: string | null;
  city: string | null;
  feed: "gcsurplus_sold" | "ns_surplus" | null;
  /** Kind the user picked; "all" means they turned the default off. */
  kindParam: LotKind | "all" | null;
  /** Kind actually applied (vehicle searches default to cars, pickups & vans; heavy-truck searches to medium & heavy trucks). */
  kind: LotKind | null;
  kindIsDefault: boolean;
  from: string | null;
  to: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: "recent" | "price_high" | "price_low";
  page: number;
  /** "all": include outliers (C$0-1, bulk lots, extreme prices) in the typical range. */
  outliers: "all" | null;
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";

export function parseLotParams(sp: Raw): LotParams {
  const q = one(sp.q).trim().slice(0, 80);
  const kp = one(sp.kind);
  const kindParam = kp === "all" ? "all" : cleanKind(kp);
  const plan = q ? planSearch(q) : null;
  const kind = kindParam === "all" ? null : kindParam ?? (plan?.heavyIntent ? "heavy_truck" : plan?.vehicleIntent ? "vehicle" : null);
  const feedRaw = one(sp.feed);
  const sortRaw = one(sp.sort);
  let minPrice = cleanPrice(one(sp.min));
  let maxPrice = cleanPrice(one(sp.max));
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  return {
    q,
    province: cleanProvince(one(sp.province)),
    city: cleanCity(one(sp.city)),
    feed: feedRaw === "ns_surplus" || feedRaw === "gcsurplus_sold" ? feedRaw : null,
    kindParam,
    kind,
    kindIsDefault: kindParam == null && kind != null,
    from: cleanDay(one(sp.from)),
    to: cleanDay(one(sp.to)),
    minPrice,
    maxPrice,
    sort: sortRaw === "price_high" || sortRaw === "price_low" ? sortRaw : "recent",
    page: Math.min(Math.max(1, Number.parseInt(one(sp.page) || "1", 10) || 1), 2000),
    outliers: one(sp.outliers) === "all" ? "all" : null,
  };
}

export function toFilters(p: LotParams, withKind = true): LotFilters {
  return { q: p.q, province: p.province, city: p.city, feed: p.feed, kind: withKind ? p.kind : null, from: p.from, to: p.to, minPrice: p.minPrice, maxPrice: p.maxPrice };
}

/** Build a URL for `path` from params with overrides (null removes a key). Page resets unless given. */
export function lotHref(path: string, p: LotParams, over: Partial<Record<"q" | "province" | "city" | "feed" | "kind" | "from" | "to" | "min" | "max" | "sort" | "page" | "outliers", string | null>> = {}): string {
  const u = new URLSearchParams();
  const base: Record<string, string | null> = {
    q: p.q || null,
    province: p.province,
    city: p.city,
    feed: p.feed,
    kind: p.kindParam,
    from: p.from,
    to: p.to,
    min: p.minPrice != null ? String(p.minPrice) : null,
    max: p.maxPrice != null ? String(p.maxPrice) : null,
    sort: p.sort !== "recent" ? p.sort : null,
    page: null,
    outliers: p.outliers,
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `${path}?${s}` : path;
}

export type KindFacet = { kind: LotKind; n: number };
/** Kind counts for a match sample, largest first. */
export function kindFacets(rows: LotLike[]): KindFacet[] {
  const c = new Map<LotKind, number>();
  for (const r of rows) {
    const k = classifyLot(r);
    c.set(k, (c.get(k) || 0) + 1);
  }
  return FILTERABLE_KINDS.filter((k) => c.get(k)).map((k) => ({ kind: k, n: c.get(k)! })).sort((a, b) => b.n - a.n);
}
