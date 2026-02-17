import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  OWNER_EMAIL: z.string().email().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000",
  OWNER_EMAIL: process.env.OWNER_EMAIL || undefined,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
}

// Supabase auth check: only depends on the two Supabase vars, not the full schema.
// This prevents unrelated env issues (e.g. missing RESEND_API_KEY) from disabling login.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured =
  typeof supabaseUrl === "string" &&
  supabaseUrl.startsWith("http") &&
  typeof supabaseKey === "string" &&
  supabaseKey.length > 0;

// Production (Vercel): require SUPABASE_SERVICE_ROLE_KEY at boot
if (
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  process.env.VERCEL === "1"
) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !String(key).trim()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required in production. Add it in Vercel → Settings → Environment Variables."
    );
  }
}

export const env: Env | null = parsed.success ? parsed.data : null;
