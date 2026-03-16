import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Newspaper } from "lucide-react";

export default async function NewsPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  const { data: posts } = await supabase
    .from("content_posts")
    .select("id, title, slug, summary, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-quantum-50">News</h1>
      <p className="text-quantum-400">Updates and insights from the Surplus Bus team.</p>

      {!posts || posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No posts yet"
          description="Content will appear here when published."
        />
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {posts.map((post: any) => {
            const isNew = post.published_at && (Date.now() - new Date(post.published_at).getTime() < 7 * 24 * 60 * 60 * 1000);
            return (
              <li
                key={post.id}
                className="bg-quantum-900 border border-quantum-700 rounded-lg p-5 hover:border-cyan-600 transition flex flex-col gap-2"
              >
                <Link href={`/news/${post.slug}`} className="block">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-cyan-400 hover:text-cyan-300 font-medium text-lg flex-1">{post.title}</h2>
                    {isNew && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 uppercase font-semibold">New</span>
                    )}
                  </div>
                  {post.summary && (
                    <p className="text-quantum-500 text-sm mt-1 line-clamp-2">{post.summary}</p>
                  )}
                  <p className="text-xs text-quantum-600 mt-2">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString()
                      : "—"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
