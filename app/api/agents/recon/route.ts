import { NextRequest, NextResponse } from 'next/server';
import { runParser } from '../../../../lib/ingestion';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Force SANDBOX_MODE = true internally
  process.env.SANDBOX_MODE = 'true';

  const sources = [
    'city_calgary_surplus',
    'city_edmonton_surplus',
    'city_ottawa_surplus',
  ];

  const results: Record<string, { reconUrl: string | null }> = {};

  for (const source of sources) {
    let reconUrl: string | null = null;
    try {
      reconUrl = await runParser(source);
      if (reconUrl) {
        // Update sources.real_host_url in Supabase
        await supabase
          .from('sources')
          .update({ real_host_url: reconUrl })
          .eq('name', source);
      }
    } catch (err) {
      reconUrl = null;
    }
    results[source] = { reconUrl };
  }

  return NextResponse.json({
    status: 'complete',
    results,
  });
}
