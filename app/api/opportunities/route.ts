import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { logApiStart, logApiEnd } from "@/lib/observability";

/**
 * GET /api/opportunities
 * Query params: province, category, q, sort, page, pageSize
 * Stable pagination: created_at desc, id desc. pageSize 10-100.
 */
export async function GET(request: NextRequest) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase) return error!;

  const url = request.nextUrl;
  const province = url.searchParams.get("province") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const q = url.searchParams.get("q") || undefined;
  const sort = url.searchParams.get("sort") || "created_at";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const rawPageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
  const pageSize = Math.min(100, Math.max(10, isNaN(rawPageSize) ? 20 : rawPageSize));
  const offset = (page - 1) * pageSize;

  const { requestId, start } = logApiStart("/api/opportunities", user?.id ?? null, {
    province,
    category,
    q: q ? "***" : undefined,
    sort,
    page,
    pageSize,
  });

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
  const ascending = sort === "closing_date";
  query = query.order(validSort, { ascending, nullsFirst: false });
  query = query.order("id", { ascending: false });

  const { data, count, error: fetchError } = await query.range(offset, offset + pageSize - 1);

  logApiEnd("/api/opportunities", requestId, start, fetchError ? 400 : 200);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  const items = data || [];
  const total = count ?? 0;

  return NextResponse.json({
    items,
    opportunities: items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
