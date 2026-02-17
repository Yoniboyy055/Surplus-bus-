# Source Registry

## What is a Source?

A **Source** is a government or public procurement/surplus portal that Surplus Bus agents scrape for opportunities. Sources are stored in `public.sources` and define:

- **base_url** — Main listing host
- **parser_key** — Identifies which parser implementation to use
- **kind** — `rfp` (tenders), `surplus` (assets), or `auction`
- **jurisdiction** — e.g. `CA-FED`, `CA-AB`, `CA-ON`

Agents read active sources from the DB and run the matching parser. No hardcoded URLs in code.

---

## Scheduling: Vercel Cron Only (Daily)

All sources run once per day via Vercel cron. `fetch_interval_minutes` is informational only; no interval-based scheduling.

| parser_key | UTC time |
|------------|----------|
| gc_buyandsell | 11:00 |
| canadabuys | 12:00 |
| ab_surplus | 13:00 |
| on_surplus | 14:00 |
| city_toronto_surplus | 15:00 |
| city_ottawa_surplus | 16:00 |
| city_calgary_surplus | 17:00 |
| city_edmonton_surplus | 18:00 |

Paths: `/api/agents/run?parser_key=<key>`

---

## parser_key Naming Convention

- **Format:** `{region}_{type}` or `{portal_name}`
- **Examples:** `gc_buyandsell`, `canadabuys`, `ab_surplus`, `on_surplus`, `city_toronto_surplus`, `city_ottawa_surplus`, `city_calgary_surplus`, `city_edmonton_surplus`
- **Lowercase, snake_case**
- Must match the switch key in the agent runner

---

## Batch-1 Sources (mock now, real scrape next)

| Layer   | parser_key            | Kind    |
|---------|------------------------|---------|
| Federal | gc_buyandsell          | surplus |
| Federal | canadabuys             | rfp     |
| Province| ab_surplus             | surplus |
| Province| on_surplus             | surplus |
| City    | city_toronto_surplus   | surplus |
| City    | city_ottawa_surplus    | surplus |
| City    | city_calgary_surplus   | surplus |
| City    | city_edmonton_surplus  | surplus |

---

## Adding Sources Safely

**Only add government/public sources.** Do not add:

- Private marketplaces
- Paywalled aggregators
- Non-official portals

**Steps:**

1. Confirm the portal is official (gov domain or authorized)
2. Add row in `public.sources` via Ops UI or SQL
3. Implement parser for `parser_key` if new
4. Set `is_active = true` when ready

---

## Schema Reference

| Column | Type | Description |
|--------|------|-------------|
| parser_key | text | Unique identifier for parser |
| kind | rfp/surplus/auction | Opportunity type |
| jurisdiction | text | e.g. CA-FED, CA-ON |
| base_url | text | Main listing URL |
| feed_url | text | Optional RSS/feed URL |
| is_active | boolean | If false, agents skip |
| fetch_interval_minutes | int | Informational only. Scheduling is Vercel cron (daily). |
| priority | int | Lower = higher priority |
