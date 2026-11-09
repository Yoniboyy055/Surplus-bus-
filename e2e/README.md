# End-to-end tests

Playwright suite that runs the production build against a **local mock Supabase**
(`mock-supabase.ts`): PGlite loaded with the schema-only reconstruction of the live
database plus fix migrations 051/052/053/055, so real RLS, grants and triggers decide
every request. Seed data comes from the real ingest code over `fixtures/open-data/`
plus synthetic GCSurplus staff contacts that must never reach the DB, API or UI.
Nothing here talks to a live Supabase, Stripe or Resend.

```bash
e2e/run.sh                 # build with the mock env, start mock + app, run all tests
SKIP_BUILD=1 e2e/run.sh    # reuse the last build
```

Needs Chromium for Playwright (`npx playwright install chromium`). Screenshots go to
`e2e/screenshots/` (gitignored).
