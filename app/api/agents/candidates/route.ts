import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Map property_data categories to properties table property_type
const CATEGORY_TO_TYPE: Record<string, string> = {
  'Vehicles': 'vehicles',
  'Equipment': 'equipment',
  'Furniture': 'furniture',
  'Electronics': 'electronics',
  'Real Estate': 'residential',
  'Industrial': 'industrial',
  'Other': 'other',
  // Lowercase fallbacks
  'vehicles': 'vehicles',
  'equipment': 'equipment',
  'furniture': 'furniture',
  'electronics': 'electronics',
  'land': 'land',
  'commercial': 'commercial',
  'residential': 'residential',
  'industrial': 'industrial',
};

const approveSchema = z.object({
  candidateId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().max(1000).optional(),
});

/**
 * PATCH /api/agents/candidates
 * 
 * Approve or reject a property candidate.
 * If approved, creates a real property record.
 * 
 * Request body:
 * {
 *   "candidateId": "uuid",
 *   "decision": "approved" | "rejected",
 *   "notes": "optional operator notes"
 * }
 */
export async function PATCH(request: Request) {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // 1. Verify operator
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "operator") {
    return NextResponse.json({ error: "Forbidden: Operator access required" }, { status: 403 });
  }

  // 2. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = approveSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({
      error: "Validation failed",
      details: parseResult.error.format(),
    }, { status: 400 });
  }

  const { candidateId, decision, notes } = parseResult.data;

  // 3. Get the candidate
  const { data: candidate, error: candidateError } = await supabase
    .from("property_candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (candidateError || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  if (candidate.status !== "queued") {
    return NextResponse.json({ 
      error: "Candidate already processed",
      current_status: candidate.status 
    }, { status: 400 });
  }

  // 4. Handle decision
  if (decision === "rejected") {
    // Simply update candidate status
    const { error: updateError } = await supabase
      .from("property_candidates")
      .update({
        status: "rejected",
        operator_decision: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        operator_notes: notes,
      })
      .eq("id", candidateId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      decision: "rejected",
      candidate_id: candidateId,
    });
  }

  // 5. Approved - create property
  const propertyData = candidate.property_data as {
    title?: string;
    description?: string;
    category?: string;
    location?: string;
    price?: number;
    photos?: string[];
    closing_date?: string;
    condition?: string;
    lot_number?: string;
  };

  // Map category to property_type
  const rawCategory = propertyData.category || 'Other';
  const propertyType = CATEGORY_TO_TYPE[rawCategory] || 'other';

  // Create the property record
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .insert({
      title: propertyData.title || 'Untitled Property',
      description: propertyData.description,
      property_type: propertyType,
      location: propertyData.location || 'Unknown',
      estimated_value: propertyData.price,
      source_url: candidate.source_url,
      candidate_id: candidateId,
      metadata: {
        source_platform: candidate.source_platform,
        source_id: candidate.source_id,
        photos: propertyData.photos,
        closing_date: propertyData.closing_date,
        condition: propertyData.condition,
        lot_number: propertyData.lot_number,
        quality_score: candidate.quality_score,
        quality_breakdown: candidate.quality_breakdown,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      },
    })
    .select()
    .single();

  if (propertyError) {
    // Check if it's a duplicate
    if (propertyError.code === '23505') {
      return NextResponse.json({
        error: "Property already created from this candidate",
      }, { status: 409 });
    }
    return NextResponse.json({ error: propertyError.message }, { status: 500 });
  }

  // 6. Update candidate status
  const { error: updateError } = await supabase
    .from("property_candidates")
    .update({
      status: "approved",
      operator_decision: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      operator_notes: notes,
    })
    .eq("id", candidateId);

  if (updateError) {
    // Property was created but candidate update failed - log but don't fail
    console.error("Failed to update candidate status:", updateError);
  }

  return NextResponse.json({
    success: true,
    decision: "approved",
    candidate_id: candidateId,
    property_id: property.id,
    property: {
      id: property.id,
      title: property.title,
      property_type: property.property_type,
      location: property.location,
      estimated_value: property.estimated_value,
    },
  });
}

/**
 * GET /api/agents/candidates
 * 
 * Get candidates with optional filtering
 * Query params: status, bucket, limit
 */
export async function GET(request: Request) {
  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "operator") {
    return NextResponse.json({ error: "Forbidden: Operator access required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "queued";
  const bucket = url.searchParams.get("bucket");
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  let query = supabase
    .from("property_candidates")
    .select("*")
    .eq("status", status)
    .order("quality_score", { ascending: false })
    .limit(Math.min(limit, 100));

  if (bucket) {
    query = query.eq("bucket", bucket);
  }

  const { data: candidates, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    candidates,
    count: candidates?.length || 0,
    filters: { status, bucket, limit },
  });
}
