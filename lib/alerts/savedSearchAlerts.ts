/**
 * Saved-search alerts: find new sold lots / tenders that match each saved
 * search since it was last checked, write them to the user's in-app inbox, and
 * (only with a recorded CASL consent and a configured sender) email a digest.
 * Nothing is reported as delivered unless the send call succeeded.
 */
import { toIlikePattern } from "@/lib/opendata/comps";

export type SavedSearch = {
  id: string;
  profile_id: string;
  name: string | null;
  query: string;
  scope: "all" | "sold" | "tenders";
  province: string | null;
  min_price: number | null;
  max_price: number | null;
  alert_frequency: "off" | "daily" | "weekly";
  alert_email: boolean;
  last_checked_at: string | null;
  created_at: string;
};

export type AlertRunSummary = {
  searches_checked: number;
  searches_skipped_not_due: number;
  inbox_items_created: number;
  emails_sent: number;
  emails_skipped: Record<string, number>;
  errors: string[];
};

type Db = { from: (t: string) => any };
export type Sender = (msg: { to: string; subject: string; html: string; text: string; headers: Record<string, string> }) => Promise<unknown>;

const PER_SEARCH_MAX = 20;
const MAX_SEARCHES_PER_RUN = 500;

export function isDue(s: Pick<SavedSearch, "alert_frequency" | "last_checked_at">, now: Date): boolean {
  if (s.alert_frequency === "off") return false;
  if (!s.last_checked_at) return true;
  const hours = s.alert_frequency === "weekly" ? 24 * 7 : 24;
  // 1 h tolerance so a daily cron at a fixed time never skips a day.
  return now.getTime() - Date.parse(s.last_checked_at) >= (hours - 1) * 3_600_000;
}

function money(n: number | null | undefined) {
  return n == null ? "" : ` · C$${Math.round(n).toLocaleString("en-CA")}`;
}

export async function runSavedSearchAlerts(opts: {
  db: Db;
  now?: Date;
  send?: Sender | null;
  canEmail?: boolean;
  buildEmail?: (args: { to: string; token: string; search: SavedSearch; items: { title: string; url: string | null; body: string | null }[] }) => {
    subject: string;
    html: string;
    text: string;
    headers: Record<string, string>;
  };
}): Promise<AlertRunSummary> {
  const now = opts.now ?? new Date();
  const db = opts.db;
  const summary: AlertRunSummary = {
    searches_checked: 0,
    searches_skipped_not_due: 0,
    inbox_items_created: 0,
    emails_sent: 0,
    emails_skipped: {},
    errors: [],
  };
  const skip = (why: string) => (summary.emails_skipped[why] = (summary.emails_skipped[why] || 0) + 1);

  const { data: searches, error } = await db
    .from("saved_searches")
    .select("id,profile_id,name,query,scope,province,min_price,max_price,alert_frequency,alert_email,last_checked_at,created_at")
    .neq("alert_frequency", "off")
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_SEARCHES_PER_RUN);
  if (error) {
    summary.errors.push(`load saved_searches: ${error.message}`);
    return summary;
  }

  for (const s of (searches || []) as SavedSearch[]) {
    if (!isDue(s, now)) {
      summary.searches_skipped_not_due++;
      continue;
    }
    summary.searches_checked++;
    const since = s.last_checked_at || s.created_at;
    const pattern = toIlikePattern(s.query);
    const items: { kind: string; title: string; body: string | null; url: string | null; source_table: string; source_id: string }[] = [];

    if (s.scope === "all" || s.scope === "sold") {
      let q = db
        .from("price_history_lots")
        .select("id,title,sold_amount,closing_date,province,city,source_url")
        .ilike("title", pattern)
        .gt("first_seen_at", since);
      if (s.province) q = q.eq("province", s.province);
      if (s.min_price != null) q = q.gte("sold_amount", s.min_price);
      if (s.max_price != null) q = q.lte("sold_amount", s.max_price);
      const { data, error: e } = await q.order("closing_date", { ascending: false, nullsFirst: false }).limit(PER_SEARCH_MAX);
      if (e) summary.errors.push(`sold ${s.id}: ${e.message}`);
      for (const r of data || []) {
        items.push({
          kind: "new_sold",
          title: `Sold: ${r.title}`,
          body: `${[r.city, r.province].filter(Boolean).join(", ")}${money(r.sold_amount)}${r.closing_date ? ` · closed ${r.closing_date}` : ""}`,
          url: `/comps?q=${encodeURIComponent(s.query)}`,
          source_table: "price_history_lots",
          source_id: r.id,
        });
      }
    }
    if (s.scope === "all" || s.scope === "tenders") {
      let q = db
        .from("tender_notices")
        .select("id,title,province,closing_date,source_url,issuing_entity")
        .eq("status", "open")
        .ilike("title", pattern)
        .gt("first_seen_at", since);
      if (s.province) q = q.eq("province", s.province);
      const { data, error: e } = await q.order("closing_date", { ascending: true, nullsFirst: false }).limit(PER_SEARCH_MAX);
      if (e) summary.errors.push(`tenders ${s.id}: ${e.message}`);
      for (const r of data || []) {
        items.push({
          kind: "new_tender",
          title: `Tender: ${r.title}`,
          body: `${r.issuing_entity || ""}${r.closing_date ? ` · closes ${String(r.closing_date).slice(0, 10)}` : ""}`,
          url: r.source_url,
          source_table: "tender_notices",
          source_id: r.id,
        });
      }
    }

    let created: { id: string; title: string; url: string | null; body: string | null }[] = [];
    if (items.length) {
      const { data, error: e } = await db
        .from("inbox_items")
        .upsert(
          items.map((i) => ({ ...i, profile_id: s.profile_id, saved_search_id: s.id })),
          { onConflict: "profile_id,saved_search_id,source_table,source_id", ignoreDuplicates: true }
        )
        .select("id,title,url,body");
      if (e) {
        summary.errors.push(`inbox ${s.id}: ${e.message}`);
        continue; // do not advance last_checked_at: retry next run
      }
      created = data || [];
      summary.inbox_items_created += created.length;
    }

    // Email digest (opt-in, consent recorded, sender configured)
    if (created.length && s.alert_email) {
      if (!opts.send || !opts.canEmail || !opts.buildEmail) skip("sender_not_configured");
      else {
        const { data: pref } = await db
          .from("user_preferences")
          .select("unsub_token,alert_email_consent_at")
          .eq("profile_id", s.profile_id)
          .maybeSingle();
        const { data: prof } = await db.from("profiles").select("email").eq("id", s.profile_id).maybeSingle();
        if (!pref?.alert_email_consent_at) skip("no_consent_record");
        else if (!prof?.email) skip("no_email");
        else {
          try {
            const mail = opts.buildEmail({ to: prof.email, token: pref.unsub_token, search: s, items: created });
            await opts.send({ to: prof.email, ...mail });
            summary.emails_sent++;
            await db
              .from("inbox_items")
              .update({ emailed_at: now.toISOString() })
              .in("id", created.map((c) => c.id));
          } catch (err) {
            skip("send_failed");
            summary.errors.push(`email ${s.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }

    const { error: ue } = await db
      .from("saved_searches")
      .update({ last_checked_at: now.toISOString(), ...(created.length ? { last_alerted_at: now.toISOString() } : {}) })
      .eq("id", s.id);
    if (ue) summary.errors.push(`advance ${s.id}: ${ue.message}`);
  }
  return summary;
}
