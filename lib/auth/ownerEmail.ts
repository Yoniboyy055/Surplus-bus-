/**
 * Owner Email checks are environment-driven only.
 */
const configuredOwner = process.env.OWNER_EMAIL?.toLowerCase().trim() ?? "";

export const OWNER_EMAIL = configuredOwner;

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!configuredOwner || !email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === configuredOwner;
}
