# Parser status (2026-11-02, titi/surplus-bus-finalize)

Times America/Toronto. Based on YkData `sources_audit.md`. **No new ingest** until Yonatan decides feed direction.

| parser_key | Status | Notes |
|---|---|---|
| gc_buyandsell | hook_pending | No mock rows. Hook for OGL sold CSV only. |
| canadabuys | hook_pending | robots Disallow:/ — CSV hook only. |
| ab_surplus | official_site_only | Mock row deleted. |
| on_surplus | official_site_only | Seed URL 404; blocked as listing scrape. Link IO overview. |
| city_toronto_surplus | official_site_only | Mock deleted; NTA not scraped. |
| city_ottawa_surplus | official_site_only | Do not scrape (Incapsula). |
| city_calgary_surplus | official_site_only | Do not scrape MA Auctions. |
| city_edmonton_surplus | official_site_only | Do not scrape MA Auctions. |
| infrastructure_ontario_surplus | official_site_only | OILC reuse prohibited. |
| city_hamilton_surplus | official_site_only | Third-party auction ToS bans spiders. |
| ns_surplus_open_data | hook_pending | New hook key; not in vercel crons. |

Parser agent crons removed from `vercel.json` until ingest is approved. News cron retained but will no-op on empty opportunities.
