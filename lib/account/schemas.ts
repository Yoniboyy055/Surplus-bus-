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

/** Waitlist consent wording actually shown on our forms. Client-sent text is only stored if it matches one. */
export const WAITLIST_CONSENT_TEXT =
  "I agree to receive emails from YK+ Systems about Surplus Bus. I can unsubscribe anytime.";
export const WAITLIST_CONSENT_FALLBACK =
  "Yes, YK+ Systems may email me when Surplus Bus beta access opens, plus occasional Surplus Bus product updates. I can unsubscribe anytime.";
export const WAITLIST_CONSENT_TEXTS = [WAITLIST_CONSENT_TEXT, WAITLIST_CONSENT_FALLBACK] as const;

export const waitlistSignup = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  use_case: z.string().trim().max(500).nullish(),
  marketing_consent: z.literal(true),
  consent_text: z.string().max(500).optional(),
  utm_source: z.string().max(64).optional(),
});
