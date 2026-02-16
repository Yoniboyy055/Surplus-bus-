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
        <ul className="space-y-4">
          {posts.map((post: any) => (
            <li
              key={post.id}
              className="bg-quantum-900 border border-quantum-700 rounded-lg p-4 hover:border-quantum-600 transition"
            >
              <Link href={`/news/${post.slug}`} className="block">
                <h2 className="text-cyan-400 hover:text-cyan-300 font-medium">{post.title}</h2>
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
          ))}
        </ul>
      )}
    </div>
  );
}
