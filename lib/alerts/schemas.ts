import { z } from "zod";

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const;

export const savedSearchCreate = z.object({
  query: z.string().trim().min(1).max(200),
  name: z.string().trim().max(80).nullish(),
  scope: z.enum(["all", "sold", "tenders"]).default("all"),
  province: z.enum(PROVINCES).nullish(),
  min_price: z.number().nonnegative().max(1e9).nullish(),
  max_price: z.number().nonnegative().max(1e9).nullish(),
});

export const savedSearchPatch = z
  .object({
    name: z.string().trim().max(80).nullish(),
    query: z.string().trim().min(1).max(200).optional(),
    scope: z.enum(["all", "sold", "tenders"]).optional(),
    province: z.enum(PROVINCES).nullish(),
    min_price: z.number().nonnegative().max(1e9).nullish(),
    max_price: z.number().nonnegative().max(1e9).nullish(),
    alert_frequency: z.enum(["off", "daily", "weekly"]).optional(),
    alert_email: z.boolean().optional(),
  })
  .strict();

export const ALERT_EMAIL_CONSENT_TEXT =
  "Email me when new public-surplus results match my saved searches. I can unsubscribe at any time with one click.";

export const alertEmailConsent = z.object({
  consent: z.literal(true),
  consent_text: z.string().max(500).optional(),
});
