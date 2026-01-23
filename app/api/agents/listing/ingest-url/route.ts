import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAgentAuth, getAuthErrorResponse } from "@/lib/agents/auth";
import { parseAlbertaSingleListing } from "@/lib/agents/parsers/alberta";
import { parseGCSurplusSingleListing } from "@/lib/agents/parsers/gc-surplus";
import type { AgentHealthEntry, SourcePlatform, ParsedListing } from "@/lib/agents/types";

const AGENT_NAME = 'manual_url_ingest';

// Schema for request body
const ingestSchema = z.object({
  source_platform: z.enum(['gc_surplus', 'alberta_auction', 'bc_auction', 'sasksurplus', 'manual']),
  source_url: z.string().url(),
});

/**
 * POST /api/agents/listing/ingest-url
 * 
 * Manual fallback for when automated scraping fails (captcha, site changes, etc.)
 * Accepts a single URL, fetches it, parses it, and queues the candidate.
 * 
 * Request body:
 * {
 *   "source_platform": "gc_surplus" | "alberta_auction" | ...,
 *   "source_url": "https://..."
 * }
 * 
 * Auth: Operator session only (no cron secret for manual operations)
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  
  // 1. Validate authorization - operator only for manual ingest
  const authResult = await validateAgentAuth(request);
  if (!authResult.authorized) {
    return getAuthErrorResponse(authResult);
  }

  // Manual ingest should only be done by operators, not cron
  if (authResult.authType !== 'operator') {
    return NextResponse.json(
      { error: "Manual ingest requires operator session" }, 
      { status: 403 }
    );
  }

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = ingestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({
      error: "Validation failed",
      details: parseResult.error.format(),
    }, { status: 400 });
  }

  const { source_platform, source_url } = parseResult.data;

  // 3. Get Supabase client
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // 4. Check if URL already exists
  const { data: existing } = await supabase
    .from('property_candidates')
    .select('id, status')
    .eq('source_url', source_url)
    .single();

  if (existing) {
    return NextResponse.json({
      success: false,
      error: "URL already exists in queue",
      existing_id: existing.id,
      existing_status: existing.status,
    }, { status: 409 });
  }

  // 5. Fetch the URL
  let html: string;
  try {
    const response = await fetch(source_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch URL: HTTP ${response.status}`,
      }, { status: 400 });
    }

    html = await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: `Failed to fetch URL: ${message}`,
    }, { status: 400 });
  }

  // 6. Parse based on source platform
  let listing: ParsedListing | null = null;

  switch (source_platform) {
    case 'alberta_auction':
      listing = parseAlbertaSingleListing(html, source_url);
      break;
    case 'gc_surplus':
      listing = parseGCSurplusSingleListing(html, source_url);
      break;
    default:
      // For other platforms, use generic parsing or return error
      return NextResponse.json({
        success: false,
        error: `Parser not implemented for platform: ${source_platform}. Use 'gc_surplus' or 'alberta_auction'.`,
      }, { status: 400 });
  }

  if (!listing) {
    return NextResponse.json({
      success: false,
      error: "Failed to parse listing from URL. Page structure may not be recognized.",
    }, { status: 400 });
  }

  // 7. Insert candidate
  const { data: inserted, error: insertError } = await supabase
    .from('property_candidates')
    .insert({
      source_platform: listing.source_platform,
      source_url: listing.source_url,
      source_id: listing.source_id,
      property_data: listing.property_data,
      quality_score: listing.quality_score,
      quality_breakdown: listing.quality_breakdown,
      bucket: listing.bucket,
      status: 'queued',
      scraped_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({
      success: false,
      error: `Failed to insert candidate: ${insertError.message}`,
    }, { status: 500 });
  }

  // 8. Log health entry
  const healthEntry: AgentHealthEntry = {
    agent_type: 'listing',
    agent_name: AGENT_NAME,
    status: 'success',
    items_found: 1,
    items_queued: 1,
    items_rejected: 0,
    execution_time_ms: Date.now() - startTime,
    source_url: source_url,
    metadata: {
      auth_type: authResult.authType,
      operator_id: authResult.userId,
      source_platform,
    },
  };

  await supabase.from('agent_health_log').insert(healthEntry);

  // 9. Return success
  return NextResponse.json({
    success: true,
    candidate: {
      id: inserted.id,
      source_id: listing.source_id,
      title: listing.property_data.title,
      quality_score: listing.quality_score,
      bucket: listing.bucket,
    },
    execution_time_ms: healthEntry.execution_time_ms,
  });
}
