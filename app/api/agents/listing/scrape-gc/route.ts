import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mockCandidates = [
    {
      source_platform: 'gc_surplus',
      source_url: 'https://gcsurplus.ca/mn-eng.cfm?snc=wfsav&sc=enc-bid&scn=12345',
      source_id: `gc-${Date.now()}-1`,
      property_data: {
        title: 'Heavy Duty Lathe - Industrial',
        description: 'Industrial metal lathe. 3-phase power required. Located in warehouse. Buyer responsible for removal.',
        category: 'Equipment',
        location: 'Ottawa, ON',
        price: 4200,
        photos: ['https://placehold.co/600x400/1e293b/white?text=Lathe'],
        closing_date: new Date(Date.now() + 86400000 * 5).toISOString()
      },
      quality_score: 92,
      quality_breakdown: { completeness: 20, condition: 15, liquidity: 10, source: 20 },
      bucket: 'approve'
    }
  ];

  const results = [];

  for (const candidate of mockCandidates) {
    const { error } = await supabase
      .from('property_candidates')
      .insert(candidate);
    
    if (!error) results.push(candidate.source_id);
  }

  await supabase.from('agent_health_log').insert({
    agent_type: 'listing',
    agent_name: 'scrape_gc_surplus',
    status: 'success',
    items_found: 1,
    items_queued: results.length,
    execution_time_ms: 850,
    source_url: 'https://gcsurplus.ca'
  });

  return NextResponse.json({ success: true, queued: results });
}
