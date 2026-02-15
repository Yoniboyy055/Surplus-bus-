# AUDIT_STRESS_REPORT

Timestamp (UTC): 2026-02-15T05:01:10Z
Role: Forensic Auditor + Load/Stress Engineer
System: Surplus Bus (Next.js + Supabase + Vercel)

## Scope & Method Constraints
- Audit-first only; no code fixes applied in this pass.
- Evidence sources are command outputs and repository files only.
- Direct `grep -R` was requested, but `rg` was used per container rule to avoid slow recursive grep.
- Preferred load tools (`k6/autocannon/wrk`) were not available. Attempt to install/use `autocannon` failed with `npm 403` (policy/network constrained). Fallback used: custom Node fetch-based load harness with explicit limitation.

---

## A) Repo Truth + Build/Runtime Audit (Evidence)

### A1. Git truth
Raw evidence: `audit_artifacts/section_a_git.txt`
- `git remote -v`: no remotes listed.
- Current branch: `work`.
- HEAD commit: `aab4807`.
- `git show --stat HEAD` shows 37 files changed in latest commit.

### A2. Dependencies/config/scripts
Raw evidence: `audit_artifacts/section_a_deps_config.txt`
- Node: `v20.19.6`
- npm: `11.4.2`
- scripts present: `dev`, `build`, `start`, `lint`.
- `next.config.js` exists and is minimal (`const nextConfig = {}`).
- `.env.example` exists.
- Env/Supabase references found in middleware, `lib/env.ts`, Supabase client/server files, and auth helper.

### A3. Install/lint/build verification
Raw evidence:
- `audit_artifacts/section_a_npm_ci.txt`
- `audit_artifacts/section_a_lint.txt`
- `audit_artifacts/section_a_build.txt`

Results:
- `npm ci`: success.
- `npm run lint`: success (`No ESLint warnings or errors`).
- `npm run build`: success, with repeated env validation errors:
  - `NEXT_PUBLIC_SUPABASE_URL` undefined
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` undefined

### A4. Runtime verification

#### MODE 1 (required env vars present)
Evidence:
- Presence check before export: `audit_artifacts/section_a_mode1_env_presence.txt` (both missing initially)
- Runtime curls after explicit env export: `audit_artifacts/section_a_mode1_runtime_curl.txt`
- Dev log excerpt: `audit_artifacts/section_a_mode1_dev_log_snippet.txt`

Observed:
- `/` returned `200`.
- `/api/health` returned `500` with payload: `{"ok":false,"supabase":"error","detail":"TypeError: fetch failed"}`.
- Interpretation: **ENV values were syntactically present but backend connectivity failed** (expected with placeholder URL/key).

#### MODE 2 (env vars missing)
Evidence:
- `audit_artifacts/section_a_mode2_runtime.txt`
- `audit_artifacts/section_a_mode2_dev_log_snippet.txt`

Observed:
- env confirmed missing.
- `/` returned `200`.
- `/api/health` returned `200` with payload: `{"ok":false,"reason":"supabase_not_configured"}`.
- Dev logs showed repeated env validation warnings; no secret values leaked.

Health endpoint status:
- `/api/health` exists and is implemented (NOT a missing endpoint).

---

## B) Security/Config Audit (Evidence)

### B1. Env handling and validation
Evidence:
- `audit_artifacts/section_b_security_config.txt`
- `lib/env.ts` (schema + `safeParse` + console errors)

Findings:
- Zod schema validation exists (`lib/env.ts`).
- Failure mode is **non-fatal warning** (`console.error`) with exported `env: null` and `isSupabaseConfigured=false`.
- Env reads also occur directly in middleware and `ensureProfile` service-role helper.

### B2. Secrets leakage checks
Evidence: `audit_artifacts/section_b_security_config.txt`
- `git grep -n sk_`: no matches.
- `git grep -n service_role`: migration docs/comments only.
- No raw secret values found in grep outputs.
- **NOT VERIFIED**: historical secret exposure outside current working tree.

### B3. Supabase usage + RLS assumptions
Evidence: `audit_artifacts/section_b_security_config.txt`
- Supabase init files: `lib/supabase/client.ts`, `lib/supabase/server.ts`.
- Service role key usage exists in `lib/auth/ensureProfile.ts` via `process.env.SUPABASE_SERVICE_ROLE_KEY` (server-only logic intended).
- Migrations present under `supabase/sql/*` including RLS-related files (`002_rls.sql`, hardening migrations).
- Prisma directory absent.

### B4. API surface audit
Evidence files:
- route list + full line dumps: `audit_artifacts/section_b_api_routes_with_lines.txt`
- derived summary: `audit_artifacts/section_b_api_surface_summary.tsv`

| Route | Auth | Validation | Rate-limit | Error handling | Evidence |
|---|---|---|---|---|---|
| `app/api/agents/health/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/agents/listing/scrape-alberta/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/agents/listing/scrape-gc/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/alerts/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/analytics/route.ts` | YES | NONE FOUND | NONE FOUND | NONE FOUND | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/beta-signups/route.ts` | NO | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/deals/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/health/route.ts` | NO | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/opportunities/ranked/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/opportunities/recompute-scores/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/payouts/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/profile/route.ts` | YES | NONE FOUND | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/referral-links/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |
| `app/api/subscription/route.ts` | YES | SOME | NONE FOUND | SOME | `audit_artifacts/section_b_api_routes_with_lines.txt` |


Notes:
- Rate limiting controls were **not found** in route handlers (code evidence scan).
- Auth-required endpoints were not functionally exercised with real credentials during stress (safe creds unavailable).

### B5. Logging/observability
Evidence: `audit_artifacts/section_b_observability.txt`
- Console logging exists in auth/profile/bootstrap and page handlers.
- No Sentry/Datadog/Logflare integration found in scanned files.
- PII redaction policy: **NOT VERIFIED** (no explicit redaction utility found in scanned backend logs).

---

## C) 15x Stress Test (Repeatable)

### C1. Tooling and constraint
Evidence: `audit_artifacts/section_c_autocannon_install_attempt.txt`
- `autocannon` install/use failed with `npm 403` (policy/network restriction).
- Fallback harness used: `audit_artifacts/stress_runner.mjs` (Node fetch-based load generator).
- This is a constraint; benchmark comparability to k6/autocannon/wrk is limited.

### C2. Load profile used (per run)
- Warmup: 10s @ concurrency 5
- Main: 60s @ concurrency 25
- Spike: 20s @ concurrency 100
- Cooldown: 10s @ concurrency 5

### C3. Endpoints exercised
- Primary (15 runs): `GET /`
- Additional same-profile runs:
  - `GET /api/health` → `run_health_profile.json`
  - `GET /landing` → `run_landing_profile.json`
- Auth-required endpoints: **NOT TESTED** (no safe test credentials provided).

### C4. Pass/fail thresholds
Run passes if:
- error_rate <= 1%
- p95 <= 800ms on GET /
- no server crash observed during run
- memory leak trend: attempted via process RSS snapshot; interpret with limitation (launcher process RSS only)

### C5. 15-run results table (`GET /`)
Evidence root: `audit_artifacts/stress_runs/run_*.json`

| Run # | RPS (main) | p50 ms | p95 ms | p99 ms | err% | 2xx | 4xx | 5xx | pass/fail | evidence |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| 1 | 100.37 | 192.05 | 231.44 | 292.31 | 0.00 | 9804 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_1.json` |
| 2 | 99.88 | 191.84 | 239.21 | 284.67 | 0.00 | 9813 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_2.json` |
| 3 | 100.19 | 190.44 | 235.39 | 286.07 | 0.00 | 9850 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_3.json` |
| 4 | 99.15 | 193.43 | 236.70 | 274.82 | 0.00 | 9788 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_4.json` |
| 5 | 99.68 | 192.90 | 235.30 | 259.16 | 0.00 | 9752 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_5.json` |
| 6 | 99.87 | 192.11 | 236.68 | 287.43 | 0.00 | 9794 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_6.json` |
| 7 | 99.46 | 191.97 | 232.85 | 272.81 | 0.00 | 9743 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_7.json` |
| 8 | 99.47 | 191.37 | 238.20 | 289.29 | 0.00 | 9848 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_8.json` |
| 9 | 98.85 | 194.31 | 239.03 | 308.96 | 0.00 | 9941 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_9.json` |
| 10 | 100.73 | 190.09 | 228.29 | 292.53 | 0.00 | 9857 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_10.json` |
| 11 | 100.29 | 193.19 | 234.51 | 269.74 | 0.00 | 9703 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_11.json` |
| 12 | 100.01 | 192.06 | 233.45 | 322.00 | 0.00 | 9827 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_12.json` |
| 13 | 99.05 | 194.27 | 236.93 | 359.59 | 0.00 | 9804 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_13.json` |
| 14 | 100.24 | 191.33 | 231.01 | 266.98 | 0.00 | 9923 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_14.json` |
| 15 | 99.07 | 193.55 | 232.06 | 278.28 | 0.00 | 9815 | 0 | 0 | PASS | `audit_artifacts/stress_runs/run_15.json` |


Aggregate evidence: `audit_artifacts/section_c_stress_aggregate.json`
- Avg main RPS: 99.75
- Avg main p95: 234.74 ms
- Avg error%: 0.00
- Failed runs: []

Additional endpoint profile summaries:
- `/api/health` main phase: RPS 303.55, p95 103.11ms, err% 0.00
- `/landing` main phase: RPS 97.81, p95 251.03ms, err% 0.00

CPU/memory snapshot evidence:
- per-run snapshots: `audit_artifacts/stress_runs/run_*_ps.txt`
- parsed deltas: `audit_artifacts/section_c_ps_memory_deltas.json`
- Observed RSS delta (measured process): constant 0 KB across runs.
- Memory leak conclusion: **NOT VERIFIED** for worker child processes; measured PID is Next launcher process.

---

## D) Failure analysis (why failing / why passing)

### Category 1: Mode1 health endpoint failure
- Symptom: `GET /api/health` returned 500 with `TypeError: fetch failed`.
- Root cause: **Proven runtime connectivity failure** when placeholder env values used.
- Evidence: `audit_artifacts/section_a_mode1_runtime_curl.txt`, `audit_artifacts/section_a_mode1_dev_log_snippet.txt`.
- Repro:
  1. export dummy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  2. run `npm run dev`
  3. `curl -i http://127.0.0.1:3000/api/health`

### Category 2: Env-gated warnings (missing Supabase env)
- Symptom: repeated `Invalid environment variables` warnings.
- Root cause: required Supabase env vars absent.
- Evidence: `audit_artifacts/section_a_build.txt`, `audit_artifacts/section_a_mode2_dev_log_snippet.txt`.
- Repro: unset vars, run dev/build.
- Classification: **ENV-GATED**, not automatically a code defect.

### Category 3: Benchmark tool availability failure
- Symptom: cannot run preferred load tool `autocannon`.
- Root cause: npm registry access policy (`403 Forbidden`).
- Evidence: `audit_artifacts/section_c_autocannon_install_attempt.txt`.
- Repro: `npx --yes autocannon -V`

### Why stress runs passed (GET /)
- All 15 runs met thresholds: err%=0, p95<800ms.
- No server crash/restart observed during run loop.
- Evidence: `audit_artifacts/section_c_stress_aggregate.json`, per-run JSON files.

### Flakiness check
- p95 std dev across 15 runs: 3.08 ms
- err% std dev: 0.00
- Interpretation: low variability for tested endpoint/profile.

### Bottleneck suspects
- No bottleneck causing failures detected in tested public endpoints (`/`, `/api/health`, `/landing`).
- Potential high-risk blind spots remain in auth-required and Supabase-dependent endpoints (not safely load-tested).

---

## E) Readiness Grade + Top Actions

### Readiness Grade: **B-**
Rationale:
- Build/lint pass and stress profile passes on public endpoints.
- Critical unknowns remain for authenticated/business-critical routes and production-grade observability/rate-limiting.
- Env-gated behavior is explicit but noisy.

### Blocking issues (before public launch)
1. No verified load results for auth-required/business endpoints (NOT TESTED due safe credentials unavailable).
2. Rate limiting not evidenced on API routes.
3. No proven external observability stack (Sentry/alerts) for production incident response.
4. `/api/health` behavior under “env present but backend unreachable” returns 500 (operationally expected, but must be incorporated into readiness SLO playbooks).

### Non-blocking improvements
- Reduce repeated env warning noise in dev/build logs.
- Add explicit PII-safe structured logger/redaction utility.
- Add synthetic checks for Supabase connectivity states.

### Top 10 actions ranked by impact/effort/risk
| # | Action | Impact | Effort | Risk if ignored |
|---:|---|---|---|---|
| 1 | Add authenticated load-test credentials + scripted safe auth flow for protected endpoints | Very High | Medium | High |
| 2 | Implement API rate limiting (edge/app-layer) on write-heavy/public endpoints | Very High | Medium | High |
| 3 | Add production observability (error tracking + alerts + request tracing) | Very High | Medium | High |
| 4 | Add canary checks for Supabase reachability and dependency status | High | Low | High |
| 5 | Add explicit PII redaction/masking in server logs | High | Low | Medium |
| 6 | Add stress test in CI (tool available in runner) for regression baselines | High | Medium | Medium |
| 7 | Add endpoint-level SLO dashboard (p95, error%, saturation) | High | Medium | Medium |
| 8 | Add request validation parity across all routes (schema-first) | Medium | Medium | Medium |
| 9 | Consolidate env handling to avoid noisy repeated warnings | Medium | Low | Low |
|10 | Add replay tooling around ingestion failures (`ingestion_failures`) | Medium | Medium | Medium |

### Fastest path to public beta
1. Establish safe test credentials + validate/load-test protected endpoints.
2. Add rate limiting + observability + alerting.
3. Define and enforce launch SLOs from this report baseline.
4. Re-run 15-run campaign (same profile) including at least one authenticated read/write route.
5. Cut release candidate only after all blocking items verified.

---

## Evidence index
- Git truth: `audit_artifacts/section_a_git.txt`
- Dependency/config scan: `audit_artifacts/section_a_deps_config.txt`
- Install/lint/build: `audit_artifacts/section_a_npm_ci.txt`, `section_a_lint.txt`, `section_a_build.txt`
- Runtime mode1: `section_a_mode1_env_presence.txt`, `section_a_mode1_runtime_curl.txt`, `section_a_mode1_dev_log_snippet.txt`
- Runtime mode2: `section_a_mode2_runtime.txt`, `section_a_mode2_dev_log_snippet.txt`
- Security/config/API: `section_b_security_config.txt`, `section_b_api_routes_with_lines.txt`, `section_b_api_surface_summary.tsv`, `section_b_observability.txt`
- Stress: `section_c_autocannon_install_attempt.txt`, `stress_runner.mjs`, `stress_runs/run_*.json`, `section_c_stress_aggregate.json`, `section_c_ps_memory_deltas.json`, `section_c_other_endpoints_summary.txt`


---

## Governor+Manager Blockers Pack Execution (2026-02-15T17:54:17Z)

Branch: `fix/audit-blockers-pack`

### Gate 0 — Safety precheck
Status: **PASS**
- No new public endpoints were added (route file list unchanged in `app/api/*`).
- Secret grep and console grep captured.
Evidence:
- `audit_artifacts/blockers/gate0_git_status.txt`
- `audit_artifacts/blockers/gate0_git_diff_stat.txt`
- `audit_artifacts/blockers/gate0_secret_grep.txt`
- `audit_artifacts/blockers/gate0_console_grep.txt`

### Gate 1 — Env integrity (fatal in production)
Status: **PASS**
- Build succeeds with env present (`gate1_build_valid_env.txt`).
- Production health call with env-present build reaches DB check and reports connectivity failure for placeholder creds (500 expected in this synthetic config): `gate1_health_valid_env.curl`.
- Build fails fast with missing env in production mode (fatal): `gate1_build_missing_env.txt` (exit 1).
Evidence:
- `audit_artifacts/blockers/gate1_build_valid_env.txt`
- `audit_artifacts/blockers/gate1_start_valid_env.log`
- `audit_artifacts/blockers/gate1_health_valid_env.curl`
- `audit_artifacts/blockers/gate1_build_missing_env.txt`

### Gate 2 — Lock down `/api/beta-signups`
Status: **PARTIAL / NOT VERIFIED**
- Input validation confirmed (`400 invalid_request`) and honeypot silent drop confirmed (`200 {ok:true}`).
- Abuse simulation returns 429s (not 5xx).
- Dedupe logic is implemented in code via `upsert(... onConflict: "email")`, but runtime dedupe behavior is **NOT VERIFIED** because this environment is in local mode (`{ok:true,"mode":"local"}`) without real Supabase backing.
Evidence:
- `audit_artifacts/blockers/gate2b_invalid_body.status` + `.json`
- `audit_artifacts/blockers/gate2b_honeypot.status` + `.json`
- `audit_artifacts/blockers/gate2b_signup1.json`
- `audit_artifacts/blockers/gate2b_signup2.json`
- `audit_artifacts/blockers/gate2_abuse_summary.json`

### Gate 3 — Global API rate limiting
Status: **PASS**
- Middleware-enforced API rate-limit policy applied by route class.
- Multi-route abuse simulation shows deterministic 429 behavior with zero 5xx on tested public routes.
Evidence:
- Code: `middleware.ts` (policy + enforcement)
- `audit_artifacts/blockers/gate3_multi_route_rl_summary.json`
- `audit_artifacts/blockers/gate3_api_routes_with_lines.txt`
- `audit_artifacts/blockers/gate3_api_surface_summary.tsv`

### Gate 4 — Remove PII logging + hardcoded owner email
Status: **PASS**
- Hardcoded owner email removed; OWNER_EMAIL is env-driven only.
- Console logging removed from `lib` and `app` scan scope.
Evidence:
- `audit_artifacts/blockers/gate4_owner_email_grep.txt`
- `audit_artifacts/blockers/gate4_console_grep.txt`
- `audit_artifacts/blockers/gate4_pii_scan.txt`

### Gate 5 — Patch vulns (high/critical)
Status: **PASS**
- `npm audit --production` summary returned empty vulnerabilities object in this environment.
Evidence:
- `audit_artifacts/blockers/gate5_npm_audit_prod.json`
- `audit_artifacts/blockers/gate5_npm_audit_summary.json`
- `audit_artifacts/blockers/gate5_npm_audit_prod.stderr`

### Gate 6 — Observability minimum
Status: **PASS**
- Added structured error tracker with sanitization and file sink.
- Controlled test error captured through `/api/health?test_error=1`.
Evidence:
- `audit_artifacts/blockers/gate6_controlled_error.curl`
- `audit_artifacts/blockers/gate6_error_events_tail.log`
- Code: `lib/observability/errorTracker.ts`, `app/api/health/route.ts`

### Gate 7 — Real stress test (Supabase enabled)
Status: **BLOCKED / NOT VERIFIED**
- Required real env vars are missing in this runtime.
- Missing exact variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Without these, DB-backed stress validation against real Supabase cannot be executed.
Evidence:
- `audit_artifacts/blockers/gate7_env_presence.txt`

### Merge Decision
- **DO NOT MERGE YET**.
- Reason: Gate 2 dedupe runtime verification is NOT VERIFIED in local mode; Gate 7 is BLOCKED due missing required real Supabase env vars.
