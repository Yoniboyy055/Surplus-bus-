/** Official open-data download and attribution URLs (never HTML scrape targets). */

export const OPEN_DATA_URLS = {
  gcsurplusSoldLatestEngZip:
    "https://donnees-data.tpsgc-pwgsc.gc.ca/bi1/gcsurplus/gcsurplus-2025-07-01--2025-12-31-eng.zip",
  gcsurplusSoldDataset:
    "https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4",
  canadabuysOpenTendersCsv:
    "https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv",
  canadabuysDataset:
    "https://open.canada.ca/data/en/dataset/6abd20d4-7a1c-4b38-baa2-9525d0bb2fd2",
  /** Human notice page pattern: /en/tender-opportunities/tender-notice/{lowercase-ref} */
  canadabuysNoticeBase: "https://canadabuys.canada.ca/en/tender-opportunities/tender-notice",
  nsPublicTenderCsv:
    "https://data.novascotia.ca/api/views/f89b-7ujj/rows.csv?accessType=DOWNLOAD",
  nsPublicTenderPage:
    "https://data.novascotia.ca/Internal-Government-Services/Surplus-Crown-Property-Purchase-and-Removal-Public/f89b-7ujj",
  nsPublicTenderDataView:
    "https://data.novascotia.ca/Internal-Government-Services/Surplus-Crown-Property-Purchase-and-Removal-Public/f89b-7ujj/data",
  nsRealPropertyCsv:
    "https://data.novascotia.ca/api/views/2kw3-tjdw/rows.csv?accessType=DOWNLOAD",
  /** Canonical human page (datasets/2kw3-tjdw redirects here). */
  nsRealPropertyPage:
    "https://data.novascotia.ca/Internal-Government-Services/Surplus-Crown-Property-Disposal-Real-Property/2kw3-tjdw",
  nsRealPropertyDataView:
    "https://data.novascotia.ca/Internal-Government-Services/Surplus-Crown-Property-Disposal-Real-Property/2kw3-tjdw/data",
} as const;

/**
 * CKAN resource UUIDs for each English “Items sold …” period file on the
 * GCSurplus “What has Sold” dataset. Verified via package_show 2026-11-09.
 * Used so a sold row can open the half-year resource page, not the dataset landing.
 */
export const GCSURPLUS_SOLD_ENG_RESOURCES: ReadonlyArray<{
  start: string;
  end: string;
  id: string;
}> = [
  { start: "2025-07-01", end: "2025-12-31", id: "b5e1082e-73ec-4cc4-a585-0d877aff005e" },
  { start: "2025-01-01", end: "2025-06-30", id: "f8d7daf0-40a0-457e-afe9-be791ab9fa3d" },
  { start: "2024-07-01", end: "2024-12-31", id: "979518b1-583f-4b19-bc5d-0a57742c13f6" },
  { start: "2024-01-01", end: "2024-06-30", id: "cfe612bb-41f1-4b90-836f-09a71e5419a4" },
  { start: "2023-07-01", end: "2023-12-31", id: "c8185aaf-6e4c-4d60-a1a1-013d482e2cf8" },
  { start: "2023-01-01", end: "2023-06-30", id: "c7f6bfd8-cbdc-42c9-b2c2-65fa78c2cbce" },
  { start: "2022-07-01", end: "2022-12-31", id: "c92a7841-643b-434c-a86a-0a7e8a9ed627" },
  { start: "2022-01-01", end: "2022-06-30", id: "adf5c064-114c-4bec-be3e-b31354782ff0" },
  { start: "2021-07-01", end: "2021-12-31", id: "6fa943d1-66a0-4aa5-b864-abda89b415d2" },
  { start: "2021-04-01", end: "2021-06-30", id: "d56a0e08-f90c-4923-adbc-f1ca54463e19" },
  { start: "2021-01-01", end: "2021-03-31", id: "44c20f16-220f-44a0-86f7-b2839ed12085" },
  { start: "2020-10-01", end: "2020-12-31", id: "704ddd0b-e685-406d-bec7-85fe7c027139" },
  { start: "2020-07-01", end: "2020-09-30", id: "b4690b37-8576-41b6-be80-6d3686826e4f" },
  { start: "2020-01-01", end: "2020-03-31", id: "a8ae2992-eaeb-4edd-8e99-57780a70ef4b" },
  { start: "2019-10-01", end: "2019-12-31", id: "e58ae9dc-39b1-4a9a-9e9e-9cb868e42132" },
  { start: "2019-07-01", end: "2019-09-30", id: "c3cc4c8a-16fb-4845-9a61-ab902388ccd1" },
  { start: "2019-04-01", end: "2019-06-30", id: "3f411634-6eaa-4a05-8d3d-8c1eae2e1750" },
  { start: "2019-01-01", end: "2019-03-31", id: "f7c67d77-9051-4f44-bbc9-80621e86fddb" },
  { start: "2018-10-01", end: "2018-12-31", id: "dc190b88-63f7-4833-a4ee-ecd0e5a27711" },
  { start: "2018-07-01", end: "2018-09-30", id: "c353aab5-b181-4e86-860f-fbaa2a02ab52" },
  { start: "2018-04-01", end: "2018-06-30", id: "d8a4c084-68af-4efe-bf01-e9535612a069" },
  { start: "2018-01-01", end: "2018-03-31", id: "4dedf108-bb58-4e14-9a31-bf46736fa881" },
  { start: "2017-10-01", end: "2017-12-31", id: "16c1cfb4-d1af-40d4-8ed9-f34b90003866" },
  { start: "2017-07-01", end: "2017-09-30", id: "94db1bbd-9082-412b-8570-d07c1781d736" },
  { start: "2017-02-21", end: "2017-08-21", id: "86bbc3f3-9ef7-476e-8c9a-0d740419f584" },
  { start: "2016-08-21", end: "2017-02-20", id: "cbd8af4c-09cf-4ad0-a499-9170be04afdc" },
  { start: "2016-02-21", end: "2016-08-20", id: "ab1c90d6-b129-4cb1-b753-349c3a2b56ec" },
  { start: "2015-08-21", end: "2016-02-20", id: "5e0f83c7-75f4-400b-8d31-8564b5cc9252" },
];

export function gcsurplusSoldResourcePageUrl(closingDate: string | null | undefined): string {
  const d = (closingDate || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const hit = GCSURPLUS_SOLD_ENG_RESOURCES.find((p) => d >= p.start && d <= p.end);
    if (hit) return `${OPEN_DATA_URLS.gcsurplusSoldDataset}/resource/${hit.id}`;
  }
  return OPEN_DATA_URLS.gcsurplusSoldDataset;
}

export function canadabuysNoticePageUrl(referenceNumber: string): string {
  const slug = referenceNumber.trim().toLowerCase();
  return `${OPEN_DATA_URLS.canadabuysNoticeBase}/${encodeURIComponent(slug)}`;
}

export function nsFilteredDataUrl(
  kind: "public_tender" | "real_property",
  fileNumber: string | null | undefined
): string {
  const base =
    kind === "real_property" ? OPEN_DATA_URLS.nsRealPropertyDataView : OPEN_DATA_URLS.nsPublicTenderDataView;
  const q = (fileNumber || "").trim();
  if (!q) return kind === "real_property" ? OPEN_DATA_URLS.nsRealPropertyPage : OPEN_DATA_URLS.nsPublicTenderPage;
  return `${base}?q=${encodeURIComponent(q)}`;
}
