import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export const dynamic = 'force-dynamic';

/** Recon always runs in sandbox mode. Recorded per row; never mutates process.env. */
const RECON_SANDBOX_MODE = true;

/**
 * Fail-closed CRON_SECRET check (same contract as /api/agents/run and
 * /api/cron/opendata-ingest), using a constant-time compare.
 */
function isAuthorizedCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const provided = Buffer.from(authHeader.slice(7), 'utf8');
  const expected = Buffer.from(cronSecret, 'utf8');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/**
 * Source recon (phase A).
 * GET /api/agents/recon
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data: sources, error } = await supabase
    .from('sources')
    .select('id, name, parser_key, base_url, feed_url, real_host_url, quality_state')
    .eq('phase_current', 'A_recon');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sources', details: error.message }, { status: 500 });
  }

  const results: Record<string, { reconUrl: string | null; outcome: string; notes: string }> = {};
  const now = new Date().toISOString();
  const passedIds: string[] = [];

  for (const source of sources) {
    let reconUrl: string | null = null;
    let outcome = 'fail';
    let notes = '';
    if (source.quality_state === 'gray') {
      outcome = 'skip';
      notes = 'Skipped due to gray quality_state';
    } else {
      try {
        const urlToFetch = source.feed_url || source.base_url;
        if (!urlToFetch) {
          notes = 'No base_url or feed_url';
        } else {
          // Try to resolve the real host by following redirects
          const res = await fetch(urlToFetch, { method: 'HEAD', redirect: 'follow' });
          if (res.url && res.url !== urlToFetch) {
            reconUrl = res.url;
            outcome = 'pass';
            notes = `Resolved to ${reconUrl}`;
            // Update sources.real_host_url
            await supabase.from('sources').update({ real_host_url: reconUrl }).eq('id', source.id);
            passedIds.push(source.id);
          } else {
            notes = 'No redirect or real host found';
          }
        }
      } catch (err) {
        notes = `Error: ${(err instanceof Error ? err.message : String(err))}`;
      }
    }
    // Write to source_recon_log
    await supabase.from('source_recon_log').insert({
      source_id: source.id,
      phase: 'A_recon',
      sandbox_mode: RECON_SANDBOX_MODE,
      discovered_host_url: reconUrl,
      vendor_family: null,
      outcome,
      notes,
      run_at: now,
    });
    results[source.name] = { reconUrl, outcome, notes };
  }

  // Update phase_current to B_consolidate for sources that passed
  if (passedIds.length > 0) {
    await supabase.from('sources').update({ phase_current: 'B_consolidate' }).in('id', passedIds);
  }

  return NextResponse.json({
    status: 'complete',
    results,
  });
}
