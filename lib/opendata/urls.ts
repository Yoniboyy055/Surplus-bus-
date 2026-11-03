/** Official open-data download URLs (never HTML scrape targets). */

export const OPEN_DATA_URLS = {
  gcsurplusSoldLatestEngZip:
    "https://donnees-data.tpsgc-pwgsc.gc.ca/bi1/gcsurplus/gcsurplus-2025-07-01--2025-12-31-eng.zip",
  gcsurplusSoldDataset:
    "https://open.canada.ca/data/en/dataset/1a09c5c1-3554-4b70-9e53-6322a72ec7d4",
  canadabuysOpenTendersCsv:
    "https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv",
  canadabuysDataset:
    "https://open.canada.ca/data/en/dataset/6abd20d4-7a1c-4b38-baa2-9525d0bb2fd2",
  nsPublicTenderCsv:
    "https://data.novascotia.ca/api/views/f89b-7ujj/rows.csv?accessType=DOWNLOAD",
  nsPublicTenderPage:
    "https://data.novascotia.ca/Internal-Government-Services/Surplus-Crown-Property-Purchase-and-Removal-Public/f89b-7ujj",
  nsRealPropertyCsv:
    "https://data.novascotia.ca/api/views/2kw3-tjdw/rows.csv?accessType=DOWNLOAD",
  nsRealPropertyPage:
    "https://data.novascotia.ca/datasets/2kw3-tjdw",
} as const;
