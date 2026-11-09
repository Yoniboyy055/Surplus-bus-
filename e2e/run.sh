#!/usr/bin/env bash
# Build the app against the local mock Supabase and run the Playwright suite.
# Never talks to a live Supabase/Stripe/Resend: all keys below are local test values.
set -euo pipefail
cd "$(dirname "$0")/.."
( cd scripts/db-dryrun && [ -d node_modules ] || npm install --no-audit --no-fund )
eval "$(npx tsx e2e/mock-supabase.ts --print-env)"
if [ "${SKIP_BUILD:-0}" != "1" ]; then npx next build; fi
npx playwright test -c e2e/playwright.config.ts "$@"
