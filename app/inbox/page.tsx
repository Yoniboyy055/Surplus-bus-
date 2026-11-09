import Link from "next/link";
import { requirePageUser } from "@/lib/account/session";
import { InboxClient, type InboxItem } from "./InboxClient";
import { track } from "@/lib/analytics/track";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const { supabase, user } = await requirePageUser("/inbox");
  const { data, error } = await supabase
    .from("inbox_items")
    .select("id,kind,title,body,url,created_at,read_at,emailed_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!error) await track("inbox_opened", { unread_count: (data || []).filter((i) => !i.read_at).length }, { userId: user.id });
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-0">
      <header>
        <h1 className="sb-title text-[28px] text-[var(--sb-ink)]">Inbox</h1>
        <p className="text-sm text-[var(--sb-ink-soft)]">
          New sold lots and tenders that match your <Link href="/saved" className="underline">saved searches</Link>.
        </p>
      </header>
      {error ? (
        <div className="banner danger" role="alert">We couldn’t load your inbox. Please refresh.</div>
      ) : (
        <InboxClient initial={(data || []) as InboxItem[]} />
      )}
    </div>
  );
}
