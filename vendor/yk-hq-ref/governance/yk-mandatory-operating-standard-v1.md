# YK Systems Mandatory Operating Standard — v1

**Status:** OWNER-APPROVED / MANDATORY / CURRENT  
**Owner:** Yonatan / YK Systems  
**Effective:** 2026-09-26  
**Applies to:** YK Systems Operations HQ and every YK Systems task, project, product, client engagement, internal system, design, code change, launch, strategy decision, monetization effort, marketing asset, operational workflow, and review governed by HQ.

## 1. Purpose

This standard converts YK Systems' working principles into mandatory operating gates for all authorized human and AI contributors.

These are not optional prompts, style preferences, or model-specific suggestions. Agents must apply the relevant gates automatically without waiting for Yonatan to name a role, framework, or checklist.

The governing rule is:

> **"It works" is not enough.**

Work is not complete merely because code runs, a document exists, or a screen looks finished. Relevant commercial, operational, technical, security, design/UX, interaction-efficiency, and evidence gates must be satisfied.

When speed conflicts with quality, **ship smaller, not weaker**. Reduce scope while preserving the required quality and safety bar. Any knowingly accepted debt, exception, blocker, or unverified assumption must be stated explicitly.

## 2. Mandatory operating systems

### 2.1 Executive Cabinet

For business, product, client, revenue, technology, marketing, finance, operations, strategy, hiring, delivery, growth, or major decisions, activate only the relevant perspectives:

- **CEO** — vision, priorities, customer ownership, product direction, expansion, major bets, final synthesis.
- **CFO** — cash, margins, pricing economics, profitability, capital allocation, financial risk and discipline.
- **COO** — execution, process, delivery, coordination, reliability, resourcing and operational readiness.
- **CIO** — technology, architecture, security, systems, automation, infrastructure and technical vendors.
- **CMO** — brand, positioning, messaging, demand generation, campaigns, launch and market entry.
- **CRO** — sales, pipeline, revenue model, deal focus, retention, LTV and revenue operations.

Do not create six artificial sections when they do not help. Surface material disagreements and tradeoffs. CEO integrates the operating direction; **Yonatan remains founder/owner and final decision-maker**.

### 2.2 Income & Asset Engine

When commercial, monetization, growth, or asset-building considerations exist, evaluate the relevant stages:

1. **Opportunity fit** — skills, time, capital, existing assets, distribution, risk tolerance and goals.
2. **Income-model selection** — software, one-time digital products, licensing, productized services, subscriptions, content, education, affiliate/partnership revenue, or other suitable models.
3. **Demand validation / build** — research real pain and willingness to pay before scaling build effort; then create, price, launch, improve.
4. **Automation** — automate repetitive research, support, marketing, analytics, operations, follow-up and delivery where quality and control are preserved.
5. **Customer acquisition** — use the channels that fit the offer; do not automatically use every channel.
6. **Sequencing / diversification** — make one stream work and systemize it before adding adjacent streams that reuse customers, assets, technology, data, distribution or expertise.
7. **Financial security** — reserves, reinvestment, cash-flow discipline, tax-aware planning, diversification, contingency and risk controls.
8. **Measurement / review** — track decision-useful metrics such as revenue, gross/net profit, conversion, CAC, LTV, retention, recurring revenue, lead flow, workload, customer satisfaction, automation effectiveness and return on time/capital.

Do not use hype such as "sell while you sleep." Distinguish active, recurring, semi-passive and genuinely passive income accurately.

### 2.3 Security & Production Readiness Guardrail

For software, websites, apps, APIs, databases, Supabase, authentication, permissions, payments/webhooks, uploads, AI-generated code, deployments, production releases, client systems, or repository changes, evaluate the applicable controls:

- server-side authorization, tenant isolation and least privilege;
- RLS where appropriate, with tests for cross-tenant access;
- established authentication/session controls and stronger protection for high-risk/admin access;
- server-side secret handling and rotation when exposure is possible;
- parameterized queries / safe bindings and strict server-side validation;
- CORS as configuration, never as authorization;
- XSS, CSRF, secure headers and HTTPS as applicable;
- admin/internal surfaces protected by server-side authorization and auditability;
- dev/staging/prod separation and production hardening;
- privacy-aware logging and sensitive-field redaction;
- rate/resource limiting and abuse controls;
- file-upload type/size/content/access validation and isolation as risk requires;
- safe identity/password handling using established providers or modern hashing where direct handling is unavoidable;
- webhook signature verification, event identity, replay/timestamp controls where supported and idempotency;
- dependency/supply-chain hygiene, lockfiles, patching and scanning;
- automated tests plus manual abuse-path review proportional to risk;
- encryption, backups, restore testing, retention/deletion needs, incident response and key rotation;
- rollback/disable planning and a release gate before production.

A configured control is not the same as a verified control. AI review, Codex, Claude, Copilot or another tool may assist security review but does not by itself prove security.

**Do not declare production-ready when a material unresolved security or reliability risk remains.**

### 2.4 Design & UX Quality System

For customer-facing, user-facing, client-facing, visual, marketing, product and interface work, design quality is a required product capability, not decoration.

Evaluate:

- screen/asset intent: trust, conversion, clarity, onboarding, explanation, comparison, education, attention or premium perception;
- audience, device, industry, brand maturity and context;
- visual direction chosen strategically rather than because a style looks impressive;
- hierarchy, readability, spacing, typography, alignment, grouping, whitespace and rhythm;
- coherent use of color, gradients, blur, glow, shadows, texture and imagery;
- navigation, defaults, feedback, error handling, consistency and accessibility;
- responsive mobile and desktop behavior;
- empty, loading, error and success states;
- trust cues, credible calls to action and transparent commercial information where applicable;
- reusable design tokens, components and layout patterns;
- placement-aware ad/social creative with a clear hook, focal point and intended action;
- explanatory anatomy/exploded-view patterns when they materially improve understanding;
- premium product presentation where it supports positioning without creating fake or misleading luxury.

YK Systems may use visual languages including minimalism, maximalism, futuristic, vector, collage, retro, cyberpunk, pop art, glassmorphism, clay, pixel art, editorial, Y2K, Swiss, surreal, bohemian, Victorian, graffiti, aurora, handwritten and other modern systems, but **style must serve the job**.

When reviewing a design, do not automatically praise it. State what feels premium, what feels amateur, what harms UX or conversion, and what should change first.

### 2.5 Interaction Cost / Path Efficiency

Every meaningful user flow must be evaluated for both:

- **user goal** — what the user came to accomplish; and
- **business goal** — the desired business outcome such as signup, purchase, booking, upload, submission, approval, upgrade or activation.

Prefer flows where these goals converge.

Evaluate:

- time to first meaningful action;
- clicks/taps/steps to the primary outcome;
- number of decisions and required fields;
- unnecessary page changes or modal hops;
- repeated data entry;
- backtracking, hunting and dead ends;
- loading/wait friction;
- whether the primary CTA is obvious at each step;
- whether the user knows what happens next.

Do not optimize blindly for the fewest possible clicks. Optimize for the **shortest clear path with the least cognitive and interaction friction** while preserving trust, comprehension, safety and necessary confirmation.

Prefer sensible defaults, autofill, preselection, progressive disclosure, inline actions, persistent context and removal of redundant steps.

For major flows, maintain a documented happy path with an interaction-count target/rationale and test it on mobile and desktop.

### 2.6 Shared synthetic simulation / MiroFish routing

MiroFish is a registered shared YK Systems synthetic-audience and multi-agent scenario-simulation tool. Read `operations/tools/mirofish-shared-simulation-standard-v1.md`.

Agents must automatically consider MiroFish when a material decision depends on likely customer/stakeholder reactions, objections, adoption behavior, messaging response, pricing/offer response, onboarding/flow behavior, launch scenarios or second-order multi-actor effects.

If it would materially reduce uncertainty or expose failure modes, route the work through MiroFish when practical. The owner does not need to remember to request it.

MiroFish is synthetic evidence, not proof of market demand, willingness to pay, conversion, retention or statistical customer behavior. Real-world validation remains required for consequential commercial claims.

MiroFish is a shared YK tool, not a dependency to install into each project repository. If the tool is materially required but unavailable in the active runtime, report `MIROFISH_REQUIRED_BUT_UNAVAILABLE` rather than silently substituting a normal single-model critique.

## 3. Mandatory completion gate

Before material work is called **done**, **ready**, **approved**, **launch-ready**, or **production-ready**, the executor/reviewer must determine which of the five operating systems apply and provide evidence for the applicable gates.

At minimum, the completion evidence must answer:

1. **Business/authority:** Is the work aligned with the current owner decision and commercial/operational objective?
2. **Execution:** Is the smallest coherent scope actually complete, testable and supportable?
3. **Security/reliability:** Are applicable security, privacy, failure-path, rollback and production-readiness checks verified?
4. **Design/UX:** Does the customer/user-facing result meet YK Systems' visual, usability, accessibility, trust and responsive-quality bar?
5. **Path efficiency:** Is the important happy path clear, and have avoidable clicks, decisions, fields, waits and dead ends been removed?
6. **Evidence:** What was tested/reviewed, what remains unverified, and what known debt or exception is being accepted?

If a gate is irrelevant, mark it **N/A with a short reason** rather than silently omitting it.

## 4. Priority and exception rule

These standards are **priority operating constraints**. They must be considered before optional polish, feature expansion or speculative scope.

An agent must not bypass a mandatory gate merely to finish faster.

If a mandatory standard cannot be satisfied within the authorized scope:

1. stop or reduce scope;
2. identify the exact blocker/risk;
3. propose the smallest compliant next move;
4. escalate any required owner, security, legal, financial or production decision.

Only a current explicit owner decision or higher-authority canonical policy may authorize a material exception. Exceptions must be documented rather than implied.

## 5. Agent behavior

All authorized agents and contributors must:

- recognize the relevant operating systems automatically;
- keep the frameworks mostly invisible when a concise answer or implementation is clearer;
- expose material tradeoffs, blockers, risks and disagreements when they affect the decision;
- avoid checklist theatre — evidence matters more than claiming a box is checked;
- distinguish current verified state from recommendation, proposal or assumption;
- prefer reuse and coherent systems over rebuilding equivalent patterns repeatedly;
- preserve repository/client separation and existing authority boundaries;
- never treat a model provider's session instructions or memory as higher authority than current owner decisions and canonical HQ policy.

Provider-specific instruction files may summarize or route to this standard, but they must not create a competing version of it.

## 6. Relationship to other HQ policy

This standard is subordinate to:

1. a current explicit owner decision; and
2. `operations/governance/cross-model-authority-standard-v1.md`.

It is otherwise a mandatory current Operations HQ policy and therefore outranks project/session instructions and historical model memory under the existing conflict order.

Security, commercial, client, legal, production, repository and controlled-write policies may impose stricter requirements. Where standards overlap, satisfy the stricter applicable requirement rather than choosing the easier one.

## 7. Immediate activation and no-grandfathering rule

This standard is **effective immediately for all YK Systems work that is open, in progress, under review, awaiting merge, awaiting release, awaiting client delivery, or otherwise not finally closed as of 2026-09-26**.

There is no grandfathering merely because work started before this standard was installed.

For every ongoing material task, branch, pull request, release candidate, client deliverable, work item, design, campaign, deployment plan, or review:

1. re-read the current repository bootstrap and applicable HQ policy before the next material action;
2. re-evaluate the current work against the mandatory operating systems and six-question completion gate;
3. fix any material gap before merge, release, delivery, production authorization, or a claim of completion;
4. explicitly record accepted debt, N/A gates, blockers, or owner-authorized exceptions;
5. do not use prior approval, prior review, or prior agent output as a substitute for the current gate when the work is still ongoing.

Already completed and finally closed historical work does not need to be reopened solely because this standard was added. If that work is modified, reactivated, re-released, or used as the basis for new material work, the current standard applies from that point forward.

A currently running agent/session that has not yet read the new policy is **not exempt**. Before its next material edit, review, merge, release, or completion claim, it must reload or be given the current repository governance and continue under the new standard.

If an executor cannot verify the current governance state, it must stop/escalate rather than proceed under stale instructions.
