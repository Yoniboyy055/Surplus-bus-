/**
 * PART 4.1: Referrer Privacy - UUID Masking
 * 
 * Converts deal UUIDs to short, shareable masked IDs for referrer view.
 * Real UUIDs are never exposed to referrers.
 */

/**
 * Generates a short masked ID from a UUID.
 * Format: REF-XXXXXX (where X is alphanumeric)
 * 
 * @param uuid - The real deal UUID
 * @returns Masked ID string
 */
export function maskDealId(uuid: string): string {
  // Use first 6 characters of UUID (after removing hyphens) and convert to uppercase
  const cleaned = uuid.replace(/-/g, "");
  const prefix = cleaned.substring(0, 6).toUpperCase();
  return `REF-${prefix}`;
}

/**
 * PART 4.1: Referrer Privacy - Status Simplification
 * 
 * Converts internal deal statuses to simplified, privacy-safe statuses
 * for referrer view. Hides sensitive operational details like EXCLUSIVE_WINDOW_ACTIVE.
 */

type InternalStatus =
  | "NEW_SUBMISSION"
  | "NEEDS_CLARIFICATION"
  | "REJECTED"
  | "QUALIFIED"
  | "MANDATE_CONFIRMED"
  | "MATCHING"
  | "OFFER_SENT"
  | "OFFER_VIEWED"
  | "EXCLUSIVE_WINDOW_ACTIVE"
  | "BUYER_COMMITTED"
  | "BID_PLACED"
  | "WON_PENDING_CLOSE"
  | "CLOSED_PAID"
  | "LOST"
  | "WITHDRAWN"
  | "ON_HOLD";

type ReferrerStatus =
  | "Pending Review"
  | "Under Review"
  | "Action Needed"
  | "In Progress"
  | "Completed"
  | "Not Pursued";

/**
 * Maps internal status to referrer-safe display status.
 * 
 * @param status - Internal deal status
 * @returns Simplified status for referrer view
 */
export function simplifyStatusForReferrer(status: InternalStatus): ReferrerStatus {
  const statusMap: Record<InternalStatus, ReferrerStatus> = {
    NEW_SUBMISSION: "Pending Review",
    NEEDS_CLARIFICATION: "Action Needed",
    REJECTED: "Not Pursued",
    QUALIFIED: "Under Review",
    MANDATE_CONFIRMED: "Under Review",
    MATCHING: "Under Review",
    OFFER_SENT: "In Progress",
    OFFER_VIEWED: "In Progress",
    EXCLUSIVE_WINDOW_ACTIVE: "In Progress", // Hidden from referrer
    BUYER_COMMITTED: "In Progress",
    BID_PLACED: "In Progress",
    WON_PENDING_CLOSE: "In Progress",
    CLOSED_PAID: "Completed",
    LOST: "Not Pursued",
    WITHDRAWN: "Not Pursued",
    ON_HOLD: "Under Review",
  };

  return statusMap[status] || "Under Review";
}
