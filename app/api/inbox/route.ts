import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET(request: NextRequest) {
  const { supabase, user, error } = await requireUser();
  if (error || !supabase || !user) return error!;
  const unreadOnly = new URL(request.url).searchParams.get("unread") === "1";
  let q = supabase
    .from("inbox_items")
    .select("id,kind,title,body,url,saved_search_id,created_at,read_at,emailed_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (unreadOnly) q = q.is("read_at", null);
  const [{ data, error: e }, { count }] = await Promise.all([
    q,
    supabase.from("inbox_items").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  if (e) return NextResponse.json({ error: "Couldn't load your inbox." }, { status: 500 });
  return NextResponse.json({ items: data || [], unread: count ?? 0 });
}
