/** Validation shared by the report form and POST /api/lot-reports. No personal data is collected. */
import { z } from "zod";
import { FILTERABLE_KINDS } from "./kinds";

export const REPORT_REASONS = [
  { value: "wrong_kind", label: "It's in the wrong group (e.g. a part listed as a vehicle)" },
  { value: "odd_price", label: "The price looks wrong or isn't a real sale price" },
  { value: "not_an_item", label: "It isn't an item for sale (a contract, a notice…)" },
  { value: "duplicate", label: "It's a duplicate of another lot" },
  { value: "other", label: "Something else" },
] as const;

/** Contact details in the note are refused rather than stored. */
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

export const lotReportInput = z.object({
  feed_key: z.enum(["gcsurplus_sold", "ns_surplus"]),
  external_id: z.string().regex(/^[A-Za-z0-9._:-]{1,80}$/),
  reason: z.enum(["wrong_kind", "odd_price", "not_an_item", "duplicate", "other"]),
  suggested_kind: z.enum(FILTERABLE_KINDS as [string, ...string[]]).nullish(),
  note: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .refine((s) => !s || (!EMAIL.test(s) && !PHONE.test(s)), { message: "contact_details" }),
  /** Honeypot: people never see or fill this field. */
  website: z.string().max(0).optional(),
});
export type LotReportInput = z.infer<typeof lotReportInput>;

/** Reports accepted per lot per day (stops one lot being flooded). */
export const REPORTS_PER_LOT_PER_DAY = 20;
