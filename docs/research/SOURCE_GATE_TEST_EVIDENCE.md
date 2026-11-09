# Source rights gate — nonproduction test evidence
Prepared 2026-11-09. Tested using Node.js built-in test runner in an isolated local environment.

Command: `node --test scripts/test-source-rights.mjs`

Observed results: **11 tests, 11 passed, 0 failed** (Node TAP output). Tests cover unknown source/action, denied restricted/pending sources, default-disabled registry, deliberately approved local fixture, collection-vs-derivation restrictions, missing signoff/review date, expiry, public display, and typed rejection.

Files: `lib/data-rights/source-rights.mjs`, `config/source-rights.json`, `scripts/test-source-rights.mjs`.

**Important limitation:** The 11 tests were run locally against matching file contents before GitHub commit. Full Next.js repo lint/build was not run (no repository checkout/network access); branch integration into existing ingestion adapters is **NOT** implemented or verified. Registry entries are disabled and not grants of data usage rights. Require independent code review, then insert `requireSourceRight` at the collection/reuse boundary and re-run repo CI.
