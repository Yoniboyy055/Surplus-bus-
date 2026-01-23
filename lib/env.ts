import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  OWNER_EMAIL: z.string().email().optional(), // Optional to prevent crash if not set in dev, but strictly should be set
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  OWNER_EMAIL: process.env.OWNER_EMAIL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
}

export const env: Env | null = parsed.success ? parsed.data : null;
export const isSupabaseConfigured = parsed.success;
