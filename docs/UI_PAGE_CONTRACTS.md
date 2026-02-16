# UI Page Contracts (Post-017)

After applying `017_intelligence_app_mvp.sql`, these pages map to tables as follows. Use this for build order and empty states.

---

## Page → Table Mapping

| Page | Reads | Writes | Key Fields | Empty State |
|------|-------|--------|------------|-------------|
| `/dashboard` | `alert_rules`, `alert_matches` (latest), `opportunity_features`, `ingestion_runs` | — | Recent matches, run freshness | "Set up alerts to get started" |
| `/alerts` | `alert_rules` | `alert_rules` (CRUD) | category, region, min/max_price, channel, filters | "Create your first alert" |
| `/feed` | `opportunity_events` (or `opportunity_history` temporarily) | — | event_type, detected_at, diff | "No new activity yet" |
| `/opportunities` | `opportunities`, `opportunity_features` | — | title, province, category, normalized_score | "No opportunities match your filters" |
| `/opportunities/[id]` | `opportunities`, `opportunity_history`, `opportunity_events` | — | Full opportunity + history | 404 |
| `/saved` | `saved_opportunities` (join opportunities) | `saved_opportunities` (insert/delete) | profile_id, opportunity_id | "Save opportunities to revisit later" |
| `/inbox` | `alert_matches`, `notification_events` (alert_delivery_events) | — | matched_at, opportunity_id | "Alerts will appear here when they match" |
| `/news` | `content_posts` (status=published) | — | title, slug, body_md, published_at | "No posts yet" |
| `/ops` (operator) | `ingestion_runs`, `ingestion_failures`, `agent_health_log`, `property_candidates` | `property_candidates` (review) | status, items_found, error_message | "Agents will populate runs" |
| `/settings` | `user_preferences`, `profiles`, `subscriptions` | `user_preferences`, `profiles` | provinces, categories, digest_frequency | — |

---

## Field Reference (017 Tables)

### saved_opportunities
- `profile_id`, `opportunity_id`, `created_at`

### alert_matches
- `alert_rule_id`, `opportunity_id`, `matched_at`, `run_id`

### opportunity_events
- `opportunity_id`, `event_type`, `diff`, `detected_at`, `run_id`
- event_type: `created`, `updated`, `status_changed`, `value_changed`, `closing_changed`

### content_posts
- `title`, `slug`, `body_md`, `status`, `authored_by_agent`, `published_at`

### opportunities (016, 017 rename)
- `issuing_entity` (was buyer_agency)

---

## Build Order

1. `/dashboard` — wire to alert_rules count, ingestion_runs freshness
2. `/alerts` — full CRUD for alert_rules
3. `/opportunities` — list from opportunities + opportunity_features
4. `/opportunities/[id]` — detail view
5. `/saved` — saved_opportunities CRUD
6. `/inbox` — alert_matches + delivery events
7. `/feed` — opportunity_events (or history)
8. `/news` — content_posts (published)
9. `/settings` — user_preferences
10. `/ops` — operator tools (ingestion, review)

---

## Cursor Build Prompt (Phase 2)

Use this prompt to generate the core intelligence UI pages in order:

```
Build the Surplus Bus intelligence UI per docs/UI_PAGE_CONTRACTS.md.

Context:
- App is intelligence/monitoring only. No marketplace (buyer/referrer/deals/payouts).
- All app pages gated behind login. Marketing pages (/, /landing, /product, /pricing, /faq) stay public.
- Use AppShell layout for authenticated pages. Nav: Dashboard, Feed, Opportunities, Alerts, Analytics (analyst only), Settings, Ops (operator only).

Build order (one phase at a time):
1. /dashboard — show alert_rules count, latest ingestion_runs freshness, empty state "Set up alerts to get started"
2. /alerts — full CRUD for alert_rules (category, region, min/max_price, channel)
3. /opportunities — list from opportunities + opportunity_features, sort by normalized_score
4. /opportunities/[id] — detail view with opportunity_history
5. /saved — saved_opportunities CRUD, empty state "Save opportunities to revisit later"
6. /inbox — alert_matches + alert_delivery_events, empty state "Alerts will appear here when they match"
7. /feed — opportunity_events (or opportunity_history) timeline
8. /news — content_posts where status=published
9. /settings — user_preferences (provinces, categories, digest_frequency)
10. /ops — operator-only: ingestion_runs, ingestion_failures, agent health

Tables: saved_opportunities, alert_matches, opportunity_events, content_posts (see 017_intelligence_app_mvp.sql).
RLS: authenticated users read opportunities/features/history/events; users CRUD own alert_rules, saved_opportunities, user_preferences.
```
