/**
 * Browser-safe env: only NEXT_PUBLIC_* names. Client components import this,
 * never lib/env.ts, so server-only variable names stay out of the client bundle.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const publicSupabaseUrl = supabaseUrl;
export const publicSupabaseAnonKey = supabaseKey;

export const isSupabaseConfigured =
  typeof supabaseUrl === "string" && supabaseUrl.startsWith("http") && typeof supabaseKey === "string" && supabaseKey.length > 0;
