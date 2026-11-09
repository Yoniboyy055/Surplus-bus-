import { timingSafeEqual } from "crypto";

/**
 * Fail-closed check for Vercel cron calls: Authorization: Bearer <CRON_SECRET>.
 * Returns false when CRON_SECRET is unset. Constant-time comparison.
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7), "utf8");
  const expected = Buffer.from(secret, "utf8");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
