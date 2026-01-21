/**
 * PART 4.2: Operator Portal - Default Filters
 * 
 * Defines action-required statuses for operator portal default filter.
 */

/**
 * Statuses that require operator action.
 * Used as default filter in operator portal.
 */
export const ACTION_REQUIRED_STATUSES = [
  "NEW_SUBMISSION",
  "NEEDS_CLARIFICATION",
  "WON_PENDING_CLOSE",
] as const;

/**
 * Checks if a status requires operator action.
 * 
 * @param status - Deal status to check
 * @returns true if status requires action
 */
export function isActionRequired(status: string): boolean {
  return ACTION_REQUIRED_STATUSES.includes(status as typeof ACTION_REQUIRED_STATUSES[number]);
}

/**
 * Generates filter clause for action-required deals.
 * For use with Supabase queries.
 * 
 * @returns Array of statuses requiring action
 */
export function getActionRequiredFilter(): string[] {
  return [...ACTION_REQUIRED_STATUSES];
}
