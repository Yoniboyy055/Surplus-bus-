/**
 * Owner Email Hardening
 * 
 * Ensures the OWNER_EMAIL (defined in env) always has operator role
 * and is routed to /operator dashboard, regardless of profile state.
 */

// We explicitly hardcode the owner email as requested to ensure safety
const HARDCODED_OWNER = "nohabe056@gmail.com";

export const OWNER_EMAIL = (process.env.OWNER_EMAIL || HARDCODED_OWNER).toLowerCase().trim();

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === OWNER_EMAIL || normalized === HARDCODED_OWNER.toLowerCase();
}
