# YK Systems Controlled Write Standard — v1

**Status:** APPROVED INTERNAL BUILD STANDARD — v1 SCOPE ONLY  
**Date:** 2026-08-10  
**Authority:** YK Systems Operations HQ + owner direction to proceed with the next controlled-write phase  
**Applies to:** `YK-OPS-WRITE-001`

## Purpose

Move Operations HQ from a read-only cockpit to the smallest useful controlled operating workflow without introducing a database, direct browser-to-main writes, autonomous external actions, or high-risk commercial/security mutations.

The v1 design follows the existing HQ build blueprint: add writes in risk order, preserve GitHub Operations HQ as the canonical policy/control repository, and keep consequential actions approval-gated.

## Core rule

> Browser/UI intent is not authority. A write becomes canonical only after validation, application on a non-main branch, audit generation, review, and merge to `main`.

No UI button, model output, local request file, or agent plan grants permission by itself.

## V1 write classes

Only these actions are authorized in `YK-OPS-WRITE-001`:

1. `NOTE_APPEND`
   - append a new immutable internal note to an existing entity reference;
   - no overwrite/delete in v1.
2. `NEXT_ACTION_SET`
   - set or replace the current internal next-action record for an existing entity;
   - optional due date;
   - previous state remains preserved in audit evidence.
3. `RISK_CREATE`
   - create a generic internal risk record using controlled severity/status values.
4. `RISK_UPDATE`
   - update severity/status/owner/mitigation/review date of an existing risk;
   - no hard deletion.
5. `WORK_ITEM_CREATE`
   - create an internal work item with bounded owner/priority/status/next-action/due/blocker fields.
6. `WORK_ITEM_UPDATE`
   - update those internal work-item fields using optimistic concurrency;
   - no authority to create client implementation authorization, contract approval, production release, money movement, or external communication.

## Explicitly excluded from v1

The write engine must reject attempts to mutate:

- owner-decision substance/status;
- client commercial terms, price, agreement, invoice or payment truth;
- Stripe or other billing systems;
- access grants/revocations or credential references;
- production/launch authorization;
- support activation;
- client/project lifecycle status transitions;
- implementation-authorization gates;
- reusable-library maturity/adoption status;
- GitHub repository visibility/settings;
- secrets/credentials/tokens/private keys;
- client customer data or confidential implementation data;
- external messages/calls/emails;
- automation or agent execution state beyond recording internal work/risk/note records.

These require later Work IDs and, where material, explicit owner/security/commercial approval.

## Repository-backed record model

V1 uses granular structured records under `operations/records/**` so low-risk operational state does not require brittle automated Markdown editing.

```text
operations/records/
├── README.md
├── notes/
├── next-actions/
├── risks/
├── work-items/
└── audit-events/
```

Rules:

- one JSON file per current mutable record where practical;
- notes and audit events are immutable append-only records;
- updates never silently erase audit history;
- record files contain internal operational metadata only, never secrets/client-confidential payloads;
- canonical policy/commercial/owner-decision Markdown remains higher authority;
- if a requested structured record contradicts higher-authority canonical policy, validation must fail rather than create a competing truth.

## Write request envelope

Each request must include at minimum:

- schema version;
- stable request ID;
- exact allowlisted action;
- actor identity/role/kind;
- authority/delegation source reference;
- target entity type + target ID;
- reason;
- source/evidence references;
- request timestamp;
- expected record digest/revision for updates, or explicit `ABSENT` expectation for creates;
- payload defined by the action schema.

The request must never accept an arbitrary filesystem path. Target paths are derived internally from controlled entity/action rules.

## Optimistic concurrency

Updates must include an expected digest of the record the operator saw.

Apply logic:

1. load current target record;
2. compute deterministic SHA-256 digest;
3. compare with request `expectedDigest`;
4. reject on mismatch;
5. only then produce the updated record + audit event.

This prevents stale UI/request state from silently overwriting newer merged truth.

## Audit requirement

Every successful application creates one immutable audit event containing:

- audit/correlation ID;
- request ID;
- actor;
- authority source;
- action;
- target entity;
- reason/source;
- applied timestamp;
- before state or `null`;
- after state;
- before/after digests where applicable;
- branch/work context;
- outcome.

Failed validation/application must return a deterministic error and must not partially mutate repository files.

## Branch and merge boundary

The apply tool must:

- refuse to run on `main`/`master`;
- refuse detached/unknown branch state unless an explicit test fixture mode is active;
- never merge;
- never push/deploy by itself;
- produce deterministic local repository changes only;
- require normal PR/CI/review/merge workflow for canonical adoption.

`main` merge is the v1 canonicalization/approval boundary.

## HQ UI posture

The browser remains untrusted for repository credentials.

V1 UI may:

- display notes, next actions, risks, work items and audit history from the validated snapshot;
- compose a write request using controlled forms;
- validate the request client-side with shared schemas;
- preview exact before/after intent;
- clearly label whether the action is low-risk and in-scope;
- export/download the request JSON for application by a trusted Git-connected runtime.

V1 UI must not:

- contain GitHub/PAT/private-key credentials;
- call GitHub write APIs directly;
- imply that exported/drafted intent is already canonical;
- alter commercial/owner/security/production truth.

A later separately approved Work ID may add an authenticated server-side write gateway after this workflow is proven.

## Reuse of existing YK packages

Implementation should consume and extend the merged package layer rather than rebuild it:

- `@yksystems/yk-design-tokens`;
- `@yksystems/yk-ui`;
- `@yksystems/yk-schemas`;
- `@yksystems/yk-agent-contract` where governance/authority references are useful.

No new package root is required for v1 unless implementation proves a hard need and SAFA approves a scope change.

## Security requirements

- allowlist actions and target entity classes;
- schema-validate all requests/records;
- reject unknown fields where they could create hidden authority or path behavior;
- derive paths, never accept path input;
- normalize/validate IDs before filesystem use;
- reject path traversal and symlink escape;
- scan free-text payloads for obvious secret/token/private-key patterns;
- no network access from the apply engine;
- no dynamic evaluation/code execution;
- atomic write behavior or rollback-on-failure;
- deterministic tests for stale-digest rejection and partial-write prevention.

## Test requirements

Minimum evidence:

- valid request → expected record + audit event;
- invalid action rejected;
- arbitrary path/path traversal rejected;
- prohibited write class rejected;
- main-branch execution rejected;
- stale digest rejected;
- invalid/unknown status/severity rejected;
- secret-like payload rejected;
- no partial mutation on validation/application failure;
- create/update audit before/after semantics tested;
- snapshot projection includes merged controlled records;
- HQ UI request composition produces schema-valid JSON;
- existing read-only integrity/security/HQ regression tests remain green;
- package tests remain green.

## Maturity / next gate

`YK-OPS-WRITE-001` proves controlled internal writes. It does not authorize direct production/browser execution.

After real internal use demonstrates the request → trusted apply → PR → merge workflow is stable, a later Work ID may evaluate an authenticated server-side GitHub write gateway. That future gateway must preserve the same request schemas, authority rules, optimistic concurrency, audit trail and approval boundary rather than bypass them.
