import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { LotSnapshot } from "@/lib/agents/parsers/types";

const TERMINAL_STATUSES = new Set<string>(["sold", "unsold", "withdrawn"]);

/**
 * Writes the final auction outcome of a lot to `canonical_lots`.
 *
 * **Immutability rule**: once `final_price` is set on a lot it must never be
 * overwritten. This function reads the current `final_price` value first and
 * returns early (no-op) if it is already populated. The database also enforces
 * this constraint via a `BEFORE UPDATE` trigger
 * (`trg_guard_final_price`), but short-circuiting here avoids an unnecessary
 * write round-trip.
 *
 * The function is also a no-op when:
 * - `snapshot.is_terminal` is `false`
 * - `snapshot.status` is not one of `'sold' | 'unsold' | 'withdrawn'`
 *
 * @param lotId    - The `canonical_lots.id` of the lot to finalise.
 * @param snapshot - The terminal lot snapshot from which outcome data is read.
 */
export async function writeFinalOutcome(
  lotId: string,
  snapshot: LotSnapshot
): Promise<void> {
  if (!snapshot.is_terminal) return;
  if (!TERMINAL_STATUSES.has(snapshot.status)) return;

  const supabase = createServiceRoleClient();

  // Read current final_price; if already set, respect immutability and skip.
  const { data: lot } = await supabase
    .from("canonical_lots")
    .select("final_price")
    .eq("id", lotId)
    .maybeSingle();

  if (lot === null || lot.final_price !== null) return;

  const { error } = await supabase
    .from("canonical_lots")
    .update({
      final_price: snapshot.current_price,
      final_bid_count: snapshot.bid_count,
      outcome: snapshot.status,
      finalized_at: snapshot.observed_at,
      final_price_source: snapshot.parser_key,
    })
    .eq("id", lotId);

  if (!error) {
    console.log(
      `[TERMINAL] lot ${lotId} → ${snapshot.status} @ ${snapshot.current_price}`
    );
  }
}
