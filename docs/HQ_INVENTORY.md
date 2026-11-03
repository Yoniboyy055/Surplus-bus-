# HQ inventory for Surplus Bus (read-only)

**HQ clone:** `/workspace/yk-team/hq-ref` ← `Yoniboyy055/Yksystems-HQ-Operations`  
**Inspected:** 2026-11-02 ~21:25 America/Toronto  
**Rules:** No push, comment, or change in HQ. No secrets / `.env` values copied.

## Summary

HQ is primarily an **operations / agent-factory / design-system package monorepo**, not a surplus scraper toolkit. Useful pieces for Surplus Bus are design tokens, UI primitives, governance standards, and agent policy notes. There are **no dedicated surplus parsers**, logos, or font files ready to drop in. Surplus Bus already has product tokens from YkDesign; HQ tokens are teal/light-first and better as a reference than a full theme swap.

## Brand assets / logos / fonts

| Item | Path | Verdict |
|---|---|---|
| Logo / mark files | — | **Not found** (no `*logo*` / brand SVG/PNG outside evidence screenshots) |
| Fonts | packages use Inter / Archivo via CSS stacks | Reference only; Surplus Bus already uses Inter via Google Fonts |
| HQ UX mockups HTML | `operations/design/hq-ux-v1/mockups/` | Ops UI patterns; not Surplus Bus marketing chrome |
| 3D tex / glTF assets | `scripts/agent-factory/public/assets/` | Unrelated to Surplus Bus product UI — **do not copy** |

## Design tokens

| Item | Path | Fit for Surplus Bus |
|---|---|---|
| `yk-design-tokens` source | `packages/yk-design-tokens/src/index.ts` | Semantic colour pairs (brand/surface/text/success/…) + spacing/radius/motion. **Copied as reference** under `vendor/yk-hq-ref/yk-design-tokens/`. Product theme stays YkDesign `sb-*` tokens. |
| Token CSS build script | `packages/yk-design-tokens/scripts/build-css.mjs` | Optional later if we publish a shared package |
| HQ app styles | `hq-app/src/styles.css` | HQ shell; not copied |

## UI components

| Item | Path | Fit |
|---|---|---|
| `yk-ui` primitives | `packages/yk-ui/src/index.tsx` | Status badge, alert, empty/loading/error, metric card, approval dialog. Patterns already mirrored in Surplus Bus `EmptyState` / new badges. **Copied as reference** (no hard dependency on `@yksystems/*`). |
| `yk-ui` styles | `packages/yk-ui/src/styles.css` | Reference copy |
| Registry | `packages/yk-ui/registry/registry.json` | Component names list |

## Scraper / parser utilities

| Item | Result |
|---|---|
| Surplus / CanadaBuys / GCSurplus parsers in HQ | **Not found** |
| Generic fetch helpers usable as ingest | **Not found** as a reusable package |

Open-data hooks remain in Surplus Bus itself (`lib/agents/parsers/hooks/*`).

## Supabase / auth helpers

| Item | Result |
|---|---|
| Shared Supabase client package | **Not found** in HQ packages |
| Auth helpers | HQ uses its own controlled-write / factory auth model — **not portable** to Surplus Bus Next/Supabase SSR without a redesign |

Surplus Bus keeps `lib/supabase/*` and `lib/auth/*`.

## Scripts / CI

| Item | Path | Fit |
|---|---|---|
| Package / registry validators | `scripts/validate-*.mjs` | HQ monorepo specific — not copied |
| Controlled write | `scripts/hq-write/` | Governance pattern reference only |
| Agent factory | `scripts/agent-factory/` | Out of scope for Surplus Bus product build |
| Vitest config | `vitest.config.ts` | Could inspire later unit tests; not wired this pass |

## Agent prompts / policies

| Item | Path | Fit |
|---|---|---|
| Mandatory operating standard | `operations/governance/yk-mandatory-operating-standard-v1.md` | **Copied** — aligns with owner DEFAULT DENY / approval rules |
| Controlled write standard | `operations/governance/controlled-write-standard-v1.md` | **Copied** |
| Repo governance bootstrap | `operations/governance/yk-repository-governance-bootstrap-standard-v1.md` | **Copied** |
| Role catalogue / routing | `operations/agents/*` | Factory-oriented; inventory only, not copied wholesale |
| GEMINI.md / CODEX bootstrap | root / `operations/agents/` | Tooling profiles — not product code |

## What was copied into Surplus Bus branch

Under `vendor/yk-hq-ref/` (reference only, not imported by Next build):

- `yk-design-tokens/src/index.ts`
- `yk-ui/src/index.tsx`
- `yk-ui/src/styles.css`
- `yk-ui/registry/registry.json`
- `governance/*.md` (three standards above)

**Not copied:** `.env*`, tokens/secrets, evidence PNGs, agent-factory 3D assets, HQ app runtime, GrandProof security lesson details beyond path citation.

## Recommendation

1. Keep Surplus Bus on YkDesign `sb-*` tokens for the product chrome.  
2. Reuse HQ empty/alert/status patterns when extending ops UI.  
3. Do not adopt HQ agent-factory as the Surplus Bus runtime.  
4. Revisit shared `@yksystems/yk-*` packages only if Yonatan wants a real monorepo publish path.
