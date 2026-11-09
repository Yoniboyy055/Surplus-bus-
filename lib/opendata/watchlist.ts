/**
 * Surplus watchlist directory — official-site-only link-out cards.
 * No lot rows. Scraping banned sources (GovDeals, OILC portal, etc.) is never done here.
 */

export type WatchlistEntry = {
  id: string;
  name: string;
  region: string;
  officialUrl: string;
  whyLinkOut: string;
  tags: string[];
};

export const SURPLUS_WATCHLIST: WatchlistEntry[] = [
  {
    id: "gcsurplus",
    name: "GC Surplus",
    region: "Canada (federal)",
    officialUrl: "https://www.gcsurplus.ca",
    whyLinkOut:
      "Live auction HTML is not under the sold-history open dataset. Browse the official site for open lots; Surplus Bus reuses only the OGL–Canada “What has Sold” CSV for price history.",
    tags: ["federal", "surplus", "auctions"],
  },
  {
    id: "govdeals",
    name: "GovDeals Canada",
    region: "Canada (multi-jurisdiction)",
    officialUrl: "https://www.govdeals.ca",
    whyLinkOut:
      "User Agreement bans spiders, crawlers, robots, substantial download/reproduce/archive, and data-mining. Link-out only.",
    tags: ["auctions", "municipal"],
  },
  {
    id: "ma_auctions",
    name: "MA Auctions",
    region: "AB / Western Canada",
    officialUrl: "https://www.maauctions.com",
    whyLinkOut:
      "No clear republish/redistribute licence for lot data; robots content-signal ai-train=no. Link-out only.",
    tags: ["auctions"],
  },
  {
    id: "infrastructure_ontario",
    name: "Infrastructure Ontario — Properties for Sale",
    region: "Ontario",
    officialUrl: "https://propertiesforsale.infrastructureontario.ca/Home.aspx",
    whyLinkOut:
      "OILC terms prohibit copying, reproducing, mirroring, or commercial republication of listing data without written consent.",
    tags: ["real property", "provincial"],
  },
  {
    id: "ottawa",
    name: "City of Ottawa procurement",
    region: "Ontario",
    officialUrl: "https://ottawa.ca/en/business/procurement",
    whyLinkOut: "Incapsula-protected; no usable robots policy for automated listing reuse. Link-out only.",
    tags: ["municipal"],
  },
  {
    id: "hamilton",
    name: "City of Hamilton surplus items",
    region: "Ontario",
    officialUrl:
      "https://www.hamilton.ca/build-invest-grow/buying-selling-city/bids-and-tenders/surplus-items-auction",
    whyLinkOut:
      "City page is informational; live lots often sit on third-party hosts (e.g. GovDeals) whose terms ban data-mining.",
    tags: ["municipal"],
  },
  {
    id: "alberta_surplus",
    name: "Alberta Surplus",
    region: "Alberta",
    officialUrl: "https://surplus.gov.ab.ca",
    whyLinkOut: "No clear open-data licence covering live lot scrape. Official site only.",
    tags: ["provincial", "surplus"],
  },
  {
    id: "toronto",
    name: "City of Toronto surplus info",
    region: "Ontario",
    officialUrl: "https://www.toronto.ca/business-economy/doing-business-with-the-city/surplus-items-auctions/",
    whyLinkOut: "Points to third-party auction channels; Surplus Bus does not scrape those hosts.",
    tags: ["municipal"],
  },
  {
    id: "calgary",
    name: "City of Calgary surplus",
    region: "Alberta",
    officialUrl: "https://www.calgary.ca/buy-sell/buy-from-city/surplus-auctions.html",
    whyLinkOut: "City page points to auction vendors; no licensed lot feed. Link-out only.",
    tags: ["municipal"],
  },
  {
    id: "edmonton",
    name: "City of Edmonton vehicle & equipment sales",
    region: "Alberta",
    officialUrl: "https://www.edmonton.ca/business_economy/vehicle-and-equipment-sales",
    whyLinkOut: "City page points to auction vendors; no licensed lot feed. Link-out only.",
    tags: ["municipal"],
  },
  {
    id: "ns_open_data",
    name: "Nova Scotia Crown surplus (open data)",
    region: "Nova Scotia",
    officialUrl: "https://data.novascotia.ca/d/f89b-7ujj",
    whyLinkOut:
      "Historical awards are ingested under OGL–NS into price history — this card links the official catalogue. Not a live auction board.",
    tags: ["provincial", "open-data"],
  },
];
