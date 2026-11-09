import { z } from "zod";

/** Legacy opportunity alert rules (/api/alerts) and saved opportunities (/api/saved). */
const price = z.number().finite().min(0).max(100_000_000).nullable().optional();
const fields = {
  category: z.string().trim().min(1).max(80),
  min_price: price,
  max_price: price,
  region: z.string().trim().max(40).nullable().optional(),
  channel: z.enum(["email", "sms", "in_app"]),
  is_active: z.boolean().optional(),
};
export const alertRuleCreate = z.object(fields).strict();
export const alertRulePatch = z.object(fields).partial().strict();
export const savedOpportunity = z.object({ opportunity_id: z.string().uuid() }).strict();

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
