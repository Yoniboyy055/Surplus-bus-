/**
 * Owner Email Hardening
 * 
 * Ensures the OWNER_EMAIL (defined in env) always has operator role
 * and is routed to /operator dashboard, regardless of profile state.
 */

export const OWNER_EMAIL = process.env.OWNER_EMAIL?.toLowerCase().trim() || null;

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!OWNER_EMAIL || !email) return false;
  return email.toLowerCase().trim() === OWNER_EMAIL;
}
