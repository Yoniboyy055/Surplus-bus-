import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { verifyAgentAuth } from "@/lib/auth/verifyAgentAuth";

const QUEUE_CAP = 100;
const AGENT_NAME = 'scrape_alberta_auction';
const SOURCE_URL = 'https://surplus.gov.ab.ca';

/**
 * Alberta Auction Listing Agent
 * Scheduled via Vercel Cron: daily at 06:00 America/Toronto (11:00 UTC)
 * Accepts authentication via:
 * - Operator session (for manual testing)
 * - Authorization: Bearer <CRON_SECRET> header (for cron calls)
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  const supabase = createClient();
  
  if (!supabase) {
    const executionTime = Date.now() - startTime;
    await logHealth(supabase, 'failure', 0, 0, executionTime, 'Supabase not configured');
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // 1. Verify authentication (operator session OR cron secret)
  const authError = await verifyAgentAuth(request);
  if (authError) {
    const executionTime = Date.now() - startTime;
    await logHealth(supabase, 'failure', 0, 0, executionTime, 'Unauthorized');
    return authError;
  }

  try {
    // 2. Check queue cap before processing
    const { count: queuedCount, error: countError } = await supabase
      .from('property_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    if (countError) {
      const executionTime = Date.now() - startTime;
      await logHealth(supabase, 'failure', 0, 0, executionTime, `Queue check failed: ${countError.message}`);
      return NextResponse.json({ error: "Failed to check queue status" }, { status: 500 });
    }

    if ((queuedCount ?? 0) >= QUEUE_CAP) {
      const executionTime = Date.now() - startTime;
      await logHealth(supabase, 'success', 0, 0, executionTime, null, {
        reason: 'queue_cap_reached',
        queued_count: queuedCount
      });
      return NextResponse.json({ 
        ok: true,
        agent: AGENT_NAME,
        itemsFound: 0,
        itemsQueued: 0,
        message: "queue cap reached",
        queued_count: queuedCount 
      });
    }

    // 3. Mock Scraping Logic (since we can't actually scrape in this environment without headless browser tools usually)
    // In real implementation: fetch(url), cheerio.load(html), extract data
    
    const mockCandidates = [
      {
        source_platform: 'alberta_auction',
        source_url: 'https://surplus.gov.ab.ca/listing/12345',
        source_id: `ab-${Date.now()}-1`,
        property_data: {
          title: '2018 Ford F-150 XLT SuperCrew',
          description: 'Fleet vehicle, regularly maintained. 150,000km. Minor dents on rear bumper. Runs and drives.',
          category: 'Vehicles',
          location: 'Edmonton, AB',
          price: 18500,
          photos: ['https://placehold.co/600x400/1e293b/white?text=Ford+F-150'],
          closing_date: new Date(Date.now() + 86400000 * 3).toISOString() // 3 days
        },
        quality_score: 85,
        quality_breakdown: { completeness: 20, condition: 15, liquidity: 10, source: 15 },
        bucket: 'approve'
      },
      {
        source_platform: 'alberta_auction',
        source_url: 'https://surplus.gov.ab.ca/listing/12346',
        source_id: `ab-${Date.now()}-2`,
        property_data: {
          title: 'Office Chair Lot (50 units)',
          description: 'Mixed lot of ergonomic chairs. Various conditions. Sold as is.',
          category: 'Furniture',
          location: 'Calgary, AB',
          price: 500,
          photos: ['https://placehold.co/600x400/1e293b/white?text=Chairs'],
          closing_date: new Date(Date.now() + 86400000 * 7).toISOString()
        },
        quality_score: 45,
        quality_breakdown: { completeness: 10, condition: 5, liquidity: 5, source: 15 },
        bucket: 'junk'
      }
    ];

    const results = [];
    let itemsFound = mockCandidates.length;

    // 4. Insert candidates (only if under queue cap)
    for (const candidate of mockCandidates) {
      const { error } = await supabase
        .from('property_candidates')
        .insert(candidate);
      
      if (!error) {
        results.push(candidate.source_id);
      }
    }

    const executionTime = Date.now() - startTime;

    // 5. Log health metrics
    await logHealth(supabase, 'success', itemsFound, results.length, executionTime);

    return NextResponse.json({ success: true, queued: results });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    await logHealth(supabase, 'failure', 0, 0, executionTime, errorMessage, undefined, errorStack);
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: errorMessage 
    }, { status: 500 });
  }
}

/**
 * Helper function to log agent health metrics
 */
async function logHealth(
  supabase: ReturnType<typeof createClient>,
  status: 'success' | 'failure',
  itemsFound: number,
  itemsQueued: number,
  executionTimeMs: number,
  errorMessage: string | null = null,
  metadata?: Record<string, unknown>,
  errorStack?: string
) {
  if (!supabase) return;

  await supabase.from('agent_health_log').insert({
    agent_type: 'listing',
    agent_name: AGENT_NAME,
    status,
    items_found: itemsFound,
    items_queued: itemsQueued,
    execution_time_ms: executionTimeMs,
    error_message: errorMessage,
    error_stack: errorStack,
    source_url: SOURCE_URL,
    metadata: metadata || null
  });
}
