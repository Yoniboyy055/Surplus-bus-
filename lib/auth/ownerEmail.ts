/**
 * Owner email is environment-driven only.
 * No hardcoded fallback is allowed.
 */

const ownerEmailEnv = process.env.OWNER_EMAIL?.toLowerCase().trim();

export const OWNER_EMAIL = ownerEmailEnv || "";

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email || !OWNER_EMAIL) return false;
  return email.toLowerCase().trim() === OWNER_EMAIL;
}
