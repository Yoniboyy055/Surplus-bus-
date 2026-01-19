import { NextResponse } from "next/server";

export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasSiteUrl = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

  return NextResponse.json({
    supabaseUrl: hasSupabaseUrl,
    supabaseAnonKey: hasSupabaseAnonKey,
    siteUrl: hasSiteUrl,
    allConfigured: hasSupabaseUrl && hasSupabaseAnonKey && hasSiteUrl,
  });
}
