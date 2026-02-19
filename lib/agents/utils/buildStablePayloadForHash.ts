/**
 * Builds a stable payload for hashing. Excludes volatile fields:
 * - updated_at
 * - detected_at
 * - source_run_id
 *
 * Only semantic fields are included for change detection.
 */
import type { ParsedOpportunity } from "@/lib/agents/parsers/types";

export function buildStablePayloadForHash(opp: ParsedOpportunity): Record<string, unknown> {
  return {
    category: opp.category,
    closing_date: opp.closing_date,
    description: opp.description,
    estimated_value: opp.estimated_value,
    external_id: opp.external_id,
    issuing_entity: opp.issuing_entity,
    province: opp.province,
    source: opp.source,
    source_url: opp.source_url,
    status: opp.status,
    title: opp.title,
  };
}
