import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, publicSupabaseAnonKey, publicSupabaseUrl } from "@/lib/env.public";

export const createClient = () => {
  if (!isSupabaseConfigured || !publicSupabaseUrl || !publicSupabaseAnonKey) return null;
  return createBrowserClient(publicSupabaseUrl, publicSupabaseAnonKey);
};
