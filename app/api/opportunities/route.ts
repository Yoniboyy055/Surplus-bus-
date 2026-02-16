import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

/**
 * GET /api/opportunities
 * Query params: province, category, q, sort, page, pageSize
 */
export async function GET(request: NextRequest) {
  const { supabase, error } = await requireUser();
  if (error || !supabase) return error!;

  const url = request.nextUrl;
  const province = url.searchParams.get("province") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const q = url.searchParams.get("q") || undefined;
  const sort = url.searchParams.get("sort") || "created_at";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("opportunities")
    .select("id, source, province, category, title, description, estimated_value, closing_date, issuing_entity, status, created_at, updated_at, source_url", { count: "exact" });

  if (province) query = query.eq("province", province);
  if (category) query = query.eq("category", category);
  if (q?.trim()) {
    const term = q.trim();
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const validSort = ["created_at", "closing_date", "estimated_value", "updated_at"].includes(sort)
    ? sort
    : "created_at";
  const ascending = sort === "closing_date"; // soonest first for closing_date
  query = query.order(validSort, { ascending, nullsFirst: false });

  const { data, count, error: fetchError } = await query.range(offset, offset + pageSize - 1);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  return NextResponse.json({
    opportunities: data || [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}
