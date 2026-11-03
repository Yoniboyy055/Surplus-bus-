/**
 * Source honesty modes for Surplus Bus.
 * "official_site_only" replaces the old "sample/mock" label — we do not invent rows.
 * No new lot ingestion until Yonatan decides feed direction (YkData audit).
 */
export type SourceMode = "live" | "partial" | "official_site_only" | "hook_pending";

export type SourceDescriptor = {
  parserKey: string;
  name: string;
  mode: SourceMode;
  province: string;
  officialUrl: string;
  honesty: string;
};

export const SOURCE_REGISTRY: SourceDescriptor[] = [
  {
    parserKey: "gc_buyandsell",
    name: "GC Surplus",
    mode: "hook_pending",
    province: "CA",
    officialUrl: "https://gcsurplus.ca",
    honesty:
      "Live open-listing ingest not built. Hook reserved for Open Government ‘What has Sold’ CSV (OGL–Canada). No mock rows.",
  },
  {
    parserKey: "canadabuys",
    name: "CanadaBuys",
    mode: "hook_pending",
    province: "CA",
    officialUrl: "https://canadabuys.canada.ca",
    honesty:
      "HTML scrape disallowed (robots Disallow:/). Hook reserved for official openTenderNotice CSV under OGL–Canada. No mock rows.",
  },
  {
    parserKey: "ab_surplus",
    name: "Alberta Surplus",
    mode: "official_site_only",
    province: "AB",
    officialUrl: "https://surplus.gov.ab.ca",
    honesty: "Placeholder parser removed. Browse the official Alberta surplus site until a licensed ingest path is approved.",
  },
  {
    parserKey: "on_surplus",
    name: "Ontario surplus (provincial)",
    mode: "official_site_only",
    province: "ON",
    officialUrl:
      "https://www.infrastructureontario.ca/en/what-we-do/real-estate-services/ontario-government-surplus-properties/",
    honesty:
      "Seeded ontario.ca surplus page returns 404. No stable provincial listing page found. Link-out to Infrastructure Ontario program overview. Portal scrape prohibited by OILC disclaimer.",
  },
  {
    parserKey: "city_toronto_surplus",
    name: "City of Toronto surplus",
    mode: "official_site_only",
    province: "ON",
    officialUrl: "https://www.toronto.ca/business-economy/doing-business-with-the-city/surplus-items-auctions/",
    honesty: "Old seed URL 404. City points to North Toronto Auction — link-out only until ToS cleared.",
  },
  {
    parserKey: "city_ottawa_surplus",
    name: "City of Ottawa",
    mode: "official_site_only",
    province: "ON",
    officialUrl: "https://ottawa.ca/en/business/procurement",
    honesty: "Incapsula-protected; do not scrape. Official site only.",
  },
  {
    parserKey: "city_calgary_surplus",
    name: "City of Calgary",
    mode: "official_site_only",
    province: "AB",
    officialUrl: "https://www.calgary.ca/buy-sell/buy-from-city/surplus-auctions.html",
    honesty: "Points to MA Auctions — no scrape (ToS unclear). Official site only.",
  },
  {
    parserKey: "city_edmonton_surplus",
    name: "City of Edmonton",
    mode: "official_site_only",
    province: "AB",
    officialUrl: "https://www.edmonton.ca/business_economy/vehicle-and-equipment-sales",
    honesty: "Points to MA Auctions — no scrape. Official site only.",
  },
  {
    parserKey: "infrastructure_ontario_surplus",
    name: "Infrastructure Ontario properties",
    mode: "official_site_only",
    province: "ON",
    officialUrl: "https://propertiesforsale.infrastructureontario.ca/Home.aspx",
    honesty: "OILC disclaimer prohibits reproducing listing data. Official site only — no scrape.",
  },
  {
    parserKey: "city_hamilton_surplus",
    name: "City of Hamilton",
    mode: "official_site_only",
    province: "ON",
    officialUrl: "https://www.hamilton.ca/build-invest-grow/buying-selling-city/bids-and-tenders/surplus-items-auction",
    honesty: "Real lots live on a third-party auction host whose User Agreement bans spiders/data-mining. Official site only.",
  },
  {
    parserKey: "ns_surplus_open_data",
    name: "Nova Scotia Crown surplus (open data)",
    mode: "hook_pending",
    province: "NS",
    officialUrl: "https://data.novascotia.ca/d/f89b-7ujj",
    honesty: "Hook for NS Open Government Licence CSV/API (historical awards). Not ingested yet.",
  },
];

export function getSourceDescriptor(parserKey: string): SourceDescriptor | undefined {
  return SOURCE_REGISTRY.find((s) => s.parserKey === parserKey);
}
