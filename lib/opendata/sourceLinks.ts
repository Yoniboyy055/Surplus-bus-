/**
 * Resolve the most specific legal public URL for a sold lot or tender row.
 *
 * GCSurplus open data has no per-lot page id (no numeric lcn). Per-item pages on
 * gcsurplus.ca need lcn; sale-account search returns 0 records. Best legal
 * destination: the half-year open.canada.ca resource page for that closing date,
 * with the sale account shown so the user can find the row in the file.
 *
 * CanadaBuys CSV noticeURL often points at MERX; we prefer the canadabuys.canada.ca
 * notice page built from reference_number (verified 2026-11-09).
 *
 * Nova Scotia: Socrata row permalinks 404; use the dataset data view filtered by
 * File # / File No.
 */
import {
  OPEN_DATA_URLS,
  canadabuysNoticePageUrl,
  gcsurplusSoldResourcePageUrl,
  nsFilteredDataUrl,
} from "./urls";

export type SourceLink = {
  href: string;
  /** Short button / anchor label, e.g. "Open source file". */
  label: string;
  /** Sale account, file #, or reference shown next to the link. */
  findBy: string | null;
  findByLabel: string | null;
  /** What the destination is, for helper text / tests. */
  kind: "gcsurplus_period_file" | "gcsurplus_dataset" | "ns_filtered_rows" | "ns_dataset" | "canadabuys_notice" | "canadabuys_dataset";
};

/** Sale account from gcs-{SALE_CNTRCT_REG_ID} or gcs-{id}-{hash}. */
export function gcsurplusSaleAccount(externalId: string | null | undefined): string | null {
  const id = (externalId || "").trim();
  const m = id.match(/^gcs-([A-Za-z0-9]+)(?:-|$)/);
  return m?.[1] || null;
}

export function resolveLotSourceLink(row: {
  feed_key: string;
  external_id: string;
  closing_date?: string | null;
  fiscal_year?: string | null;
  file_number?: string | null;
  category?: string | null;
  kind?: string | null;
  source_url?: string | null;
}): SourceLink {
  if (row.feed_key === "ns_surplus") {
    const nsKind =
      row.category === "real_property" || row.kind === "real_property" ? "real_property" : "public_tender";
    const file = (row.file_number || "").trim() || null;
    if (file) {
      return {
        href: nsFilteredDataUrl(nsKind, file),
        label: "Find in NS open data",
        findBy: file,
        findByLabel: "File #",
        kind: "ns_filtered_rows",
      };
    }
    return {
      href:
        nsKind === "real_property" ? OPEN_DATA_URLS.nsRealPropertyPage : OPEN_DATA_URLS.nsPublicTenderPage,
      label: "NS open data",
      findBy: null,
      findByLabel: null,
      kind: "ns_dataset",
    };
  }

  // Default / gcsurplus_sold
  const sale = gcsurplusSaleAccount(row.external_id);
  const href = gcsurplusSoldResourcePageUrl(row.closing_date);
  const isPeriod = href.includes("/resource/");
  return {
    href,
    label: isPeriod ? "Open source file" : "GCSurplus open data",
    findBy: sale,
    findByLabel: sale ? "Sale account" : null,
    kind: isPeriod ? "gcsurplus_period_file" : "gcsurplus_dataset",
  };
}

export function resolveTenderSourceLink(row: {
  reference_number?: string | null;
  source_url?: string | null;
}): SourceLink {
  const ref = (row.reference_number || "").trim();
  if (ref) {
    return {
      href: canadabuysNoticePageUrl(ref),
      label: "View on CanadaBuys",
      findBy: ref,
      findByLabel: "Reference",
      kind: "canadabuys_notice",
    };
  }
  const stored = (row.source_url || "").trim();
  if (stored.startsWith("https://canadabuys.canada.ca/")) {
    return {
      href: stored,
      label: "View on CanadaBuys",
      findBy: null,
      findByLabel: null,
      kind: "canadabuys_notice",
    };
  }
  return {
    href: OPEN_DATA_URLS.canadabuysDataset,
    label: "CanadaBuys open data",
    findBy: null,
    findByLabel: null,
    kind: "canadabuys_dataset",
  };
}
