/**
 * Source honesty modes for Surplus Bus.
 * "official_site_only" = link-out cards; never invent rows.
 * Open-data feeds: live/partial only when licensed CSV ingest is wired.
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
    mode: "partial",
    province: "CA",
    officialUrl: "https://gcsurplus.ca",
    honesty:
      "Live open auctions: official site only. Price history from OGL–Canada “What has Sold” CSV (attribution required). No mock rows.",
  },
  {
    parserKey: "canadabuys",
    name: "CanadaBuys",
    mode: "live",
    province: "CA",
    officialUrl: "https://canadabuys.canada.ca",
    honesty:
      "Open tender notices from official open-data CSV under OGL–Canada. HTML scrape disallowed (robots Disallow:/). Attribution required.",
  },
  {
    parserKey: "ab_surplus",
    name: "Alberta Surplus",
    mode: "official_site_only",
    province: "AB",
    officialUrl: "https://surplus.gov.ab.ca",
    honesty: "No licensed live-lot feed. Browse the official Alberta surplus site.",
  },
  {
    parserKey: "on_surplus",
    name: "Ontario surplus (provincial)",
    mode: "official_site_only",
    province: "ON",
    officialUrl:
      "https://www.infrastructureontario.ca/en/what-we-do/real-estate-services/ontario-government-surplus-properties/",
    honesty:
      "No stable provincial listing open feed. Link-out to Infrastructure Ontario overview. Portal scrape prohibited by OILC disclaimer.",
  },
  {
    parserKey: "city_toronto_surplus",
    name: "City of Toronto surplus",
    mode: "official_site_only",
    province: "ON",
    officialUrl: "https://www.toronto.ca/business-economy/doing-business-with-the-city/surplus-items-auctions/",
    honesty: "City points to third-party auctions — link-out only until ToS cleared.",
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
    honesty: "Points to MA Auctions — no scrape. Official site only.",
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
    honesty: "Third-party auction hosts ban spiders/data-mining. Official site only.",
  },
  {
    parserKey: "ns_surplus_open_data",
    name: "Nova Scotia Crown surplus (open data)",
    mode: "partial",
    province: "NS",
    officialUrl: "https://data.novascotia.ca/d/f89b-7ujj",
    honesty:
      "Historical awards under Open Government Licence – Nova Scotia (attribution required). Not a live auction board.",
  },
];

export function getSourceDescriptor(parserKey: string): SourceDescriptor | undefined {
  return SOURCE_REGISTRY.find((s) => s.parserKey === parserKey);
}
