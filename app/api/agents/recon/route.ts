import { NextRequest, NextResponse } from 'next/server';
import { runParser } from '@/lib/agents/parsers';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Force SANDBOX_MODE = true internally
  process.env.SANDBOX_MODE = 'true';

  const sources = [
    'city_calgary_surplus',
    'city_edmonton_surplus',
    'city_ottawa_surplus',
  ];

  const supabase = createServiceRoleClient();
  const results: Record<string, { reconUrl: string | null }> = {};

  for (const source of sources) {
    let reconUrl: string | null = null;
    try {
      // runParser expects (parserKey, ctx), but ctx is required
      // We'll provide a minimal context with baseUrl for each source
      const ctx = { parserKey: source, baseUrl: '', feedUrl: undefined };
      const parserResult = await runParser(source, ctx);
      reconUrl = parserResult.reconUrl ?? null;
      if (reconUrl) {
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
