import { z } from "zod";

export const profilePatch = z
  .object({
    full_name: z.string().trim().max(120).nullish(),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[0-9+().\s-]*$/, "Phone can contain digits, spaces, +, -, ( and ) only")
      .nullish(),
  })
  .strict();

export const MARKETING_CONSENT_TEXT =
  "Send me occasional Surplus Bus product updates by email. I can unsubscribe at any time with one click.";

export const marketingConsent = z.object({ consent: z.literal(true) });
