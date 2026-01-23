import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateAgentAuth, getAuthErrorResponse } from "@/lib/agents/auth";
import { scrapeAlbertaListings } from "@/lib/agents/parsers/alberta";
import type { AgentHealthEntry, ParsedListing } from "@/lib/agents/types";

const AGENT_NAME = 'scrape_alberta_auction';
const SOURCE_URL = 'https://surplus.gov.ab.ca';

/**
 * POST /api/agents/listing/scrape-alberta
 * 
 * Scrapes Alberta government surplus auction listings.
 * 
 * Auth: Requires either:
 * - x-cron-secret header matching CRON_SECRET env var (for automated cron)
 * - Authenticated operator session (for manual triggers)
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  
  // 1. Validate authorization
  const authResult = await validateAgentAuth(request);
  if (!authResult.authorized) {
    return getAuthErrorResponse(authResult);
  }

  // 2. Get Supabase client
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" }, 
      { status: 500 }
    );
  }

  // 3. Execute scraping
  let healthEntry: AgentHealthEntry = {
    agent_type: 'listing',
    agent_name: AGENT_NAME,
    status: 'success',
    items_found: 0,
    items_queued: 0,
    items_rejected: 0,
    execution_time_ms: 0,
    source_url: SOURCE_URL,
    metadata: { auth_type: authResult.authType },
  };

  try {
    const { listings, errors } = await scrapeAlbertaListings();
    
    healthEntry.items_found = listings.length;
    
    if (errors.length > 0 && listings.length === 0) {
      // Complete failure
      healthEntry.status = 'failure';
      healthEntry.error_message = errors.join('; ');
    }

    // 4. Insert candidates into database
    const queuedIds: string[] = [];
    const rejectedReasons: string[] = [];

    for (const listing of listings) {
      const { error: insertError } = await supabase
        .from('property_candidates')
        .upsert({
          source_platform: listing.source_platform,
          source_url: listing.source_url,
          source_id: listing.source_id,
          property_data: listing.property_data,
          quality_score: listing.quality_score,
          quality_breakdown: listing.quality_breakdown,
          bucket: listing.bucket,
          status: 'queued',
          scraped_at: new Date().toISOString(),
        }, {
          onConflict: 'source_platform,source_id',
          ignoreDuplicates: true, // Skip if already exists
        });

      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate - not an error, just skip
          rejectedReasons.push(`Duplicate: ${listing.source_id}`);
        } else {
          rejectedReasons.push(`${listing.source_id}: ${insertError.message}`);
        }
        healthEntry.items_rejected++;
      } else {
        queuedIds.push(listing.source_id);
        healthEntry.items_queued++;
      }
    }

    // 5. Calculate execution time
    healthEntry.execution_time_ms = Date.now() - startTime;
    
    // Add any scraping errors to metadata
    if (errors.length > 0) {
      healthEntry.metadata = {
        ...healthEntry.metadata,
        scrape_errors: errors,
        rejected_reasons: rejectedReasons.slice(0, 10), // Limit stored reasons
      };
    }

    // 6. Log health entry
    await supabase.from('agent_health_log').insert(healthEntry);

    // 7. Return response
    return NextResponse.json({
      success: healthEntry.status === 'success',
      agent: AGENT_NAME,
      stats: {
        items_found: healthEntry.items_found,
        items_queued: healthEntry.items_queued,
        items_rejected: healthEntry.items_rejected,
        execution_time_ms: healthEntry.execution_time_ms,
      },
      queued_ids: queuedIds,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    // Unexpected error
    healthEntry.status = 'failure';
    healthEntry.execution_time_ms = Date.now() - startTime;
    healthEntry.error_message = error instanceof Error ? error.message : 'Unknown error';
    healthEntry.error_stack = error instanceof Error ? error.stack : undefined;

    // Log health entry even on failure
    await supabase.from('agent_health_log').insert(healthEntry);

    return NextResponse.json({
      success: false,
      agent: AGENT_NAME,
      error: healthEntry.error_message,
      stats: {
        items_found: healthEntry.items_found,
        items_queued: healthEntry.items_queued,
        items_rejected: healthEntry.items_rejected,
        execution_time_ms: healthEntry.execution_time_ms,
      },
    }, { status: 500 });
  }
}

/**
 * GET /api/agents/listing/scrape-alberta
 * 
 * Returns agent status and last run info
 */
export async function GET(request: Request) {
  const authResult = await validateAgentAuth(request);
  if (!authResult.authorized) {
    return getAuthErrorResponse(authResult);
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data: lastRuns } = await supabase
    .from('agent_health_log')
    .select('*')
    .eq('agent_name', AGENT_NAME)
    .order('created_at', { ascending: false })
    .limit(5);

  const { count: queuedCount } = await supabase
    .from('property_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('source_platform', 'alberta_auction')
    .eq('status', 'queued');

  return NextResponse.json({
    agent: AGENT_NAME,
    source_url: SOURCE_URL,
    queued_candidates: queuedCount || 0,
    last_runs: lastRuns || [],
  });
}
