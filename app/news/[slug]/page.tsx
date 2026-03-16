import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient();
  if (!supabase) redirect("/auth?error=supabase_not_configured");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  const { data: post, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !post) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="mb-2">
        <Link href="/news" className="text-cyan-400 hover:underline text-sm">← Back to news</Link>
      </div>
      <div>
        <p className="text-quantum-500 text-sm">
          {post.published_at
            ? new Date(post.published_at).toLocaleDateString()
            : "—"}
        </p>
        <h1 className="text-2xl font-bold text-quantum-50 mt-1">{post.title}</h1>
      </div>

      {post.summary && (
        <p className="text-quantum-400 text-lg">{post.summary}</p>
      )}

      {post.body_md && (
        <div className="prose prose-invert prose-quantum max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-quantum-400">{post.body_md}</pre>
        </div>
      )}
    </div>
  );
}
