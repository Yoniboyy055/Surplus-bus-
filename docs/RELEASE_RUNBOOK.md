# Release runbook: Surplus Bus finalize branch

Every step here needs Yonatan's go-ahead. Nothing in this file has been run against production.
Times are America/Toronto.

## 0. Before anything
- Take a schema snapshot of the live project (Dashboard → Database → Backups, or
  `supabase db dump --schema-only > pre_051_schema.sql`). This is the rollback for 051, which only
  changes policies, grants, function settings and adds columns.
- Confirm a point-in-time backup exists for today.

## 1. Hotfix (urgent, independent): `hotfix/recon-auth`
- One file: `/api/agents/recon` requires `CRON_SECRET` and no longer flips `SANDBOX_MODE`.
- Deploy from main + this commit. Check: `curl -i https://<prod>/api/agents/recon` → 401.
- Rollback: redeploy the previous Vercel deployment (Instant Rollback).

## 2. Migrations 051, 052, 053, 055 (before the app deploy)
Apply in order. Each is idempotent and wrapped in a transaction. Dry-run evidence:
`scripts/db-dryrun` (`npm run after`, `npm run idempotency`), 43/43 exploit and regression checks pass.
- 051 security hardening: fixes the live `profiles` policy recursion (42P17), role self-escalation,
  anon-executable SECURITY DEFINER functions, mutable search_path, definer views; adds beta_signups
  consent columns. Rollback: restore policies/grants from the step-0 snapshot; drop the 3 new
  `beta_signups` columns only if no consent rows were written.
- 052 open-data feeds: new tables only. Rollback: drop the 4 new tables (data is re-ingestable).
- 053 saved searches + inbox + consent columns. Rollback in the file header.
- 055 analytics_events (server-only insert; stays empty while `ANALYTICS_EVENTS_ENABLED` is unset).
- Verify: Security Advisor shows no anon-executable definer functions; run the read-only checks in
  `docs_local/ECC_AUDIT_2026-11-09.md` (C2, C3).

## 3. App deploy (preview first)
- Set env vars from `.env.example` (Stripe **test** keys and price IDs on preview only).
- Preview checks: `/`, `/price-history`, `/tenders`, sign-in, `/saved`, `/inbox`, `/settings`,
  `POST /api/unsubscribe` one-click, `/robots.txt`, `/sitemap.xml`, response headers (CSP, HSTS).
- Run the ingest cron once by hand with the bearer secret and check `open_data_ingest_runs`.
- Rollback: Vercel Instant Rollback to the previous deployment. Migrations 051–055 are backward
  compatible with the current main build (main keeps working; 054 is not applied yet).

## 4. Migration 054 (after the app deploy is live)
- Revokes anon INSERT on `beta_signups` (the new build writes server-side). Applying it before the
  deploy would break the old waitlist form. Rollback in the file header.

## 5. Later, separately
- Next 15.5 branch (`titi/next15-upgrade`): own preview, own regression pass.
- Stripe live mode, Upstash, analytics flags, legal review: see REVIEW_PACKAGE approvals.
