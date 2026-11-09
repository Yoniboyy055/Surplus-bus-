# Migrations: source of truth

**`supabase/migrations/` is now the source of truth** and matches the live
project (`nycsuizssbpaqyhxxxup`) migration history exactly:

| Range | Origin | Status on live |
|---|---|---|
| `20260121185125` … `20260316025652` (49 files) | Copied verbatim from live `supabase_migrations.schema_migrations` (read-only query, 2026-11-09) | **Applied** |
| `20261109150000_051_security_hardening.sql` | New (PR #28) | Not applied — needs Yonatan's approval |
| `20261109150100_052_open_data_feeds.sql` | Was `supabase/sql/046_open_data_feeds.sql` | Not applied — needs approval |
| `20261109150200_053_saved_searches_inbox.sql` | New | Not applied — needs approval |
| `20261109150300_054_beta_signups_server_only.sql` | New | Apply **only after** the branch is deployed |

Order to apply: 051 → 052 → 053 → (deploy branch) → 054.

## Name collisions
Live already records a `046` (`20260315195410_046_fix_phase_c_allow_multi_selection`)
and `042`–`050` with different meanings from the files in `supabase/sql/`. The
PR #28 open-data file was therefore renamed to **052** with a timestamp version
(`20261109150100`) so it cannot collide with any recorded version.

## Legacy `supabase/sql/`
Historic hand-applied scripts (001–044). Kept for reference only; do not apply.
Mapping of the overlapping ones:

| `supabase/sql/` | Live equivalent |
|---|---|
| 042_drop_broken_upsert_and_duplicate_index | live `049_drop_broken_upsert_and_duplicate_constraint` + `050_fix_source_records_upsert_constraints` |
| 043_extend_source_recon_log | live `add_source_recon_operating_sequence` (columns present live) |
| 044_procurement_signals | table present live (applied outside the migration log) |

009 and 043 were edited only to make a clean-room replay succeed (see commit
`2b038bc`); neither change alters live.

## Deferred (do NOT apply)
`supabase/deferred/045_drop_referral_deal_objects.DO_NOT_APPLY.sql` drops the
legacy referral/deal tables. Per the PR #28 work order, referrals/deals and
`audit_logs` are preserved until Yonatan retires them individually, with a backup.

## Dry run (no live access needed)
```
cd scripts/db-dryrun && npm install && npm run before && npm run after && npm run idempotency
```
Builds an in-memory PGlite from `supabase/live_snapshot/` (schema, policies and
grants only, read from live catalogs; no rows), applies the migrations, and runs
signed-out / member / operator / service-role regression and exploit checks plus
advisor-equivalent counts.
