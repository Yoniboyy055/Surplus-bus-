# Cron plan: `main` vs `titi/surplus-bus-finalize` (PROPOSAL)

Status: **proposal for Yonatan's decision**. Nothing here is applied to production.
Prepared 2026-11-09 (America/Toronto) in answer to PR #28 review item 7.
Sources: `vercel.json` on `origin/main` and on this branch, `lib/agents/parsers/index.ts`,
`lib/sources/modes.ts`, `docs/PARSER_STATUS.md`, `lib/agents/runAgentRunner.ts`,
`app/api/agents/news/route.ts`. Schedules are UTC (Vercel cron); Toronto time is UTC-5 in winter.

## What changed

`main` has 11 crons. This branch has 3. The parser crons were removed in commit
`bf1e4cd` ("Pause parser crons in vercel.json until feed direction is approved").

| # | Cron on `main` (UTC) | On branch? | What the job does **on this branch** (from code) | Proposal | Why |
|---|---|---|---|---|---|
| 1 | `agents/run?parser_key=infrastructure_ontario_surplus` 10:00 | No | `parseLinkOutOnly` → 0 rows | Retire | Source mode `official_site_only`: "OILC disclaimer prohibits reproducing listing data". Job would only log. |
| 2 | `agents/run?parser_key=gc_buyandsell` 11:00 | No | `parseGcSurplusSoldCsvHook` → 0 rows for the ZIP URL (logs that cron ingest handles it) | Retire, replaced by #12 | Sold history now goes to `price_history_lots` via `/api/cron/opendata-ingest`. On `main` this job emitted a placeholder row ("TODO: Replace with real scraper"). |
| 3 | `agents/run?parser_key=canadabuys` 12:00 | **Yes** (12:00) | `parseCanadaBuysCsvHook` → official OGL CSV | Keep | Only live open-tender source; CSV only, no HTML (robots Disallow:/). |
| 4 | `agents/run?parser_key=ab_surplus` 13:00 | No | `parseLinkOutOnly` → 0 rows | Retire | `official_site_only`: no licensed live-lot feed. |
| 5 | `agents/run?parser_key=on_surplus` 14:00 | No | `parseLinkOutOnly` → 0 rows | Retire | `official_site_only`: seed URL 404, listing scrape blocked. |
| 6 | `agents/run?parser_key=city_toronto_surplus` 15:00 | No | `parseLinkOutOnly` → 0 rows | Retire | `official_site_only`: third-party auctions, ToS not cleared. |
| 7 | `agents/run?parser_key=city_ottawa_surplus` 16:00 | No | `parseLinkOutOnly` → 0 rows | Retire | `official_site_only`: Incapsula-protected, do not scrape. |
| 8 | `agents/run?parser_key=city_calgary_surplus` 17:00 | No | `parseLinkOutOnly` → 0 rows | Retire | `official_site_only`: MA Auctions, no scrape. |
| 9 | `agents/run?parser_key=city_edmonton_surplus` 18:00 | No | `parseLinkOutOnly` → 0 rows | Retire | `official_site_only`: MA Auctions, no scrape. |
| 10 | `agents/run?parser_key=city_hamilton_surplus` 19:00 | No | `parseLinkOutOnly` → 0 rows | Retire | `official_site_only`: auction host bans spiders. |
| 11 | `agents/news` 20:00 | **Yes** (20:00) | Builds a daily brief from opportunities created in the last 24 h; no-op if none | Keep | Unchanged path; fail-closed CRON_SECRET check added in `10e813c`. |
| 12 | — (new) `cron/opendata-ingest` 11:30 | **Yes** (new) | GCSurplus sold ZIP + NS OGL CSVs + CanadaBuys CSV → `price_history_lots` / `tender_notices` | Add | Needs migration 046 applied and service role key set (owner action). Without them it runs in dry-run and reports `skipped`. |

`ns_surplus_open_data` has a parser hook but was never in a cron on either branch; NS is
covered by #12.

## Coverage and side effects to be aware of (from code)

- **Rows**: on this branch the 8 retired link-out keys return 0 opportunities whether or not
  their cron runs, so retiring them loses no listing rows on this branch. Versus `main`, the
  rows those parsers produced are gone because `bf1e4cd` deleted the mock/placeholder parsers,
  not because the crons were removed.
- **Run history**: `executeAgentRun` writes a `source_runs` row each time a parser cron runs.
  Retiring a cron stops those rows, so ops views that read last-run time
  (`app/ops/sources`, `app/ops/runs`, `supabase/sql/024_last_run_per_parser.sql`,
  `034_source_health_view.sql`) will show those sources as not run / stale. Option: mark
  them inactive in `sources` (DB change, owner approval), or keep one cheap daily heartbeat.
- **Email alerts**: none of the 11 `main` crons sends email. `git grep` on `origin/main` finds
  email sending only in `app/api/beta-signups`, `app/api/ops/email/discount/send` and
  `lib/email/resend.ts`. So the cron change itself does not remove an email-alert job. The
  separate product question (daily email alert digest promised on `main` pricing/settings vs
  in-app-only copy on this branch) is still open and is not decided here.
- **Timing**: `cron/opendata-ingest` at 11:30 UTC runs after the old `gc_buyandsell` slot and
  before `canadabuys` at 12:00. A live dry run on 2026-11-09 fetched, unzipped and parsed
  all three feeds in about 2.4 s (15,347 GCSurplus rows, 924 CanadaBuys, 225 NS). DB upsert
  time is not measured (no database touched).

## Decisions needed from Yonatan

1. Approve retiring crons #1, #2, #4–#10 (or name any to keep).
2. Keep #3 and #11 as is?
3. Approve adding #12, and when to apply migration 046 + set the service role key.
4. What to do with run history for retired sources (mark inactive vs heartbeat).
5. Product: email digest vs in-app only (separate from this cron list).
