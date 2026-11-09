import Link from "next/link";
import { requirePageUser } from "@/lib/account/session";
import { getUserLimits } from "@/lib/billing/entitlements";
import { fetchFeedStatus } from "@/lib/opendata/queries";
import { FeedFreshnessChip } from "@/components/DataStateNotice";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const { supabase, user } = await requirePageUser("/dashboard");
  const [profile, saved, unread, recent, limits, feeds] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("saved_searches").select("id,name,query,alert_frequency", { count: "exact" }).order("created_at", { ascending: false }).limit(3),
    supabase.from("inbox_items").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("inbox_items").select("id,title,body,created_at,read_at").order("created_at", { ascending: false }).limit(5),
    getUserLimits(supabase, user.id),
    fetchFeedStatus(["gcsurplus_sold", "canadabuys", "ns_surplus"]),
  ]);
  const first = (profile.data?.full_name || "").split(" ")[0];
  const savedRows = saved.data || [];
  const recentRows = recent.data || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-0">
      <header className="space-y-1">
        <h1 className="sb-title text-[28px] text-[var(--sb-ink)]">{first ? `Welcome back, ${first}` : "Welcome back"}</h1>
        <p className="text-sm text-[var(--sb-ink-soft)]">Know the sold range before you bid. Live auctions stay on the official sites.</p>
      </header>

      <form action="/comps" method="get" role="search" className="flex max-w-[640px] items-center gap-2.5 rounded-full border border-[var(--sb-line)] bg-[var(--sb-surface-raised)] py-2 pl-[22px] pr-2 shadow-raised">
        <input name="q" required aria-label="Look up sold comps" placeholder="pickup truck, office chair…" className="min-w-0 flex-1 border-0 bg-transparent px-0 py-3 shadow-none focus:ring-0" />
        <button className="btn btn-primary shrink-0" type="submit">Look up</button>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/inbox" className="card card-interactive block no-underline" data-tile="inbox">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent-700)]">Inbox</div>
          <div className="sb-mono mt-1 text-[32px] font-bold text-[var(--sb-ink)]">{unread.count ?? 0}</div>
          <div className="text-sm text-[var(--sb-ink-soft)]">unread matches</div>
        </Link>
        <Link href="/saved" className="card card-interactive block no-underline" data-tile="saved">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent-700)]">Saved searches</div>
          <div className="sb-mono mt-1 text-[32px] font-bold text-[var(--sb-ink)]">
            {saved.count ?? savedRows.length}
            <span className="text-base font-medium text-[var(--sb-ink-soft)]"> / {limits.savedSearches}</span>
          </div>
          <div className="text-sm text-[var(--sb-ink-soft)]">{savedRows.filter((s) => s.alert_frequency !== "off").length} with alerts on</div>
        </Link>
        <div className="card" data-tile="data">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--sb-accent-700)]">Data</div>
          {feeds.state === "ok" ? (
            <div className="mt-2 flex flex-col items-start gap-1.5">
              <FeedFreshnessChip label="GCSurplus" status={feeds.feeds.gcsurplus_sold} />
              <FeedFreshnessChip label="CanadaBuys" status={feeds.feeds.canadabuys} />
              <FeedFreshnessChip label="Nova Scotia" status={feeds.feeds.ns_surplus} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--sb-ink-soft)]">Data status unavailable right now.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card" aria-labelledby="recent-h">
          <h2 id="recent-h" className="sb-title mb-3 text-lg">Latest in your inbox</h2>
          {recentRows.length ? (
            <ul className="space-y-2">
              {recentRows.map((i) => (
                <li key={i.id} className="text-sm">
                  <span className={i.read_at ? "text-[var(--sb-ink-soft)]" : "font-semibold text-[var(--sb-ink)]"}>{i.title}</span>
                  {i.body && <span className="block text-xs text-[var(--sb-ink-soft)]">{i.body}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--sb-ink-soft)]">No matches yet. They arrive after the next daily data refresh.</p>
          )}
        </section>
        <section className="card" aria-labelledby="saved-h">
          <h2 id="saved-h" className="sb-title mb-3 text-lg">Your saved searches</h2>
          {savedRows.length ? (
            <ul className="space-y-2">
              {savedRows.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-[var(--sb-ink)]">{s.name || s.query}</span>
                  <Link href={`/comps?q=${encodeURIComponent(s.query)}`} className="underline text-[var(--sb-accent-700)]">Comps</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--sb-ink-soft)]">
              Look up an item, then press <strong>Save this search</strong> to get new matches in your inbox.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
