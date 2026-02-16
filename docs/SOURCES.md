# Source Registry

## What is a Source?

A **Source** is a government or public procurement/surplus portal that Surplus Bus agents scrape for opportunities. Sources are stored in `public.sources` and define:

- **base_url** — Main listing host
- **parser_key** — Identifies which parser implementation to use
- **kind** — `rfp` (tenders), `surplus` (assets), or `auction`
- **jurisdiction** — e.g. `CA-FED`, `CA-AB`, `CA-ON`

Agents read active sources from the DB and run the matching parser. No hardcoded URLs in code.

---

## parser_key Naming Convention

- **Format:** `{region}_{type}` or `{portal_name}`
- **Examples:** `gc_buyandsell`, `canadabuys`, `ab_surplus`
- **Lowercase, snake_case**
- Must match the switch key in the agent runner

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
| fetch_interval_minutes | int | Target interval (default 1440) |
| priority | int | Lower = higher priority |
