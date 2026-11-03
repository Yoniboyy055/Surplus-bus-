import { createHash } from "crypto";
import type { ParsedOpportunity } from "@/lib/agents/parsers/types";
import { parseCsv, provinceCode } from "./csv";
import { OGL_CANADA } from "./attribution";
import { OPEN_DATA_URLS } from "./urls";

export type CanadaBuysTenderRow = ParsedOpportunity & {
  reference_number: string;
  solicitation_number: string | null;
  notice_type: string | null;
  procurement_category: string | null;
  publication_date: string | null;
  licence_id: typeof OGL_CANADA.id;
  regions_of_delivery: string | null;
};

function stableId(ref: string, amend: string): string {
  return createHash("sha256")
    .update(`canadabuys|${ref}|${amend}`)
    .digest("hex")
    .slice(0, 32);
}

function mapStatus(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s === "open") return "open";
  if (s === "cancelled") return "closed";
  if (s === "expired") return "expired";
  return s || "open";
}

function categoryFromProcurement(raw: string | null): string | null {
  if (!raw) return null;
  const codes = raw.replace(/\*/g, "").split(/[|,]/).map((x) => x.trim()).filter(Boolean);
  const map: Record<string, string> = {
    CNST: "Construction",
    GD: "Goods",
    SRV: "Services",
    SRVTGD: "Services related to goods",
  };
  const labels = codes.map((c) => map[c] || c);
  return labels.length ? labels.join(", ") : null;
}

export function parseCanadaBuysOpenTendersCsv(csvText: string): CanadaBuysTenderRow[] {
  const { rows } = parseCsv(csvText);
  const out: CanadaBuysTenderRow[] = [];
  for (const row of rows) {
    const title = (row["title-titre-eng"] || row["title-titre-fra"] || "").trim();
    const ref = (row["referenceNumber-numeroReference"] || "").trim();
    if (!title || !ref) continue;
    const amend = (row["amendmentNumber-numeroModification"] || "").trim();
    const statusRaw = row["tenderStatus-appelOffresStatut-eng"] || "";
    const status = mapStatus(statusRaw);
    const url =
      (row["noticeURL-URLavis-eng"] || row["noticeURL-URLavis-fra"] || "").trim() ||
      OPEN_DATA_URLS.canadabuysDataset;
    const closing = (row["tenderClosingDate-appelOffresDateCloture"] || "").trim() || null;
    const pub = (row["publicationDate-datePublication"] || "").trim() || null;
    const entity = (row["contractingEntityName-nomEntitContractante-eng"] || "").trim() || null;
    const prov = provinceCode(row["contractingEntityAddressProvince-entiteContractanteAdresseProvince-eng"]);
    const desc = (row["tenderDescription-descriptionAppelOffres-eng"] || "").replace(/\s+/g, " ").trim();
    const procurement = (row["procurementCategory-categorieApprovisionnement"] || "").trim() || null;
    const noticeType = (row["noticeType-avisType-eng"] || "").trim() || null;
    const regions = (row["regionsOfDelivery-regionsLivraison-eng"] || "").trim() || null;

    out.push({
      source: "canadabuys",
      external_id: stableId(ref, amend),
      source_url: url,
      province: prov || "CA",
      category: categoryFromProcurement(procurement),
      title,
      description: desc ? desc.slice(0, 800) : null,
      estimated_value: null,
      closing_date: closing,
      issuing_entity: entity,
      status,
      reference_number: ref,
      solicitation_number: (row["solicitationNumber-numeroSollicitation"] || "").trim() || null,
      notice_type: noticeType,
      procurement_category: procurement,
      publication_date: pub,
      licence_id: OGL_CANADA.id,
      regions_of_delivery: regions,
      is_terminal: status !== "open",
    });
  }
  return out;
}

/** Map to scoring / opportunities shape (open only preferred upstream). */
export function toParsedOpportunity(row: CanadaBuysTenderRow): ParsedOpportunity {
  return {
    source: row.source,
    external_id: row.external_id,
    source_url: row.source_url,
    province: row.province,
    category: row.category,
    title: row.title,
    description: row.description,
    estimated_value: row.estimated_value,
    closing_date: row.closing_date,
    issuing_entity: row.issuing_entity,
    status: row.status,
    is_terminal: row.is_terminal,
  };
}
