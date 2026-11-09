# YK Systems Repository Governance Bootstrap Standard — v1

**Status:** OWNER-APPROVED / MANDATORY / CURRENT  
**Owner:** Yonatan / YK Systems  
**Effective:** 2026-09-26  
**Canonical HQ:** `Yoniboyy055/Yksystems-HQ-Operations`

## Purpose

Every repository that belongs to the YK Systems company lane must inherit YK Systems Operations HQ governance without duplicating the full private HQ policy into each project.

This standard defines the minimum durable bootstrap required in every YK Systems product, client implementation, core operations repository, and other repository explicitly governed by YK Systems HQ.

## Required bootstrap

Every governed repository must contain a root `YK_SYSTEMS_HQ.md` that:

1. identifies `Yoniboyy055/Yksystems-HQ-Operations` as the canonical company policy repository;
2. points to:
   - `operations/governance/cross-model-authority-standard-v1.md`;
   - `operations/governance/yk-mandatory-operating-standard-v1.md`;
3. states the authority order:
   - current explicit owner decision;
   - current HQ authority/policy;
   - current project/client authority and local repository policy;
   - task/session instructions;
   - historical memory;
4. carries a compact local baseline of the mandatory operating systems so an agent cannot treat HQ inaccessibility as permission to ignore them;
5. requires the agent to distinguish verified state from assumptions/recommendations;
6. includes the six explicit completion-gate questions from the mandatory operating standard, so the local fallback remains actionable even when private HQ cannot be read;
7. requires relevant completion gates before work is called done/ready/production-ready;
8. requires agents to stop/escalate rather than silently weaken HQ policy.

## Agent entry points

Where the agent/provider is used, repository entry points must direct it to `YK_SYSTEMS_HQ.md` before material work:

- `AGENTS.md` — Codex and general repository-aware engineering agents;
- `CLAUDE.md` — Claude;
- `GEMINI.md` — Gemini;
- `.github/copilot-instructions.md` — GitHub Copilot / Copilot review.

Existing project instructions remain in place. The HQ bootstrap is added above or alongside them; it does not erase project-specific rules.

Provider-specific instruction files must not become competing company policy.

## Local baseline when HQ cannot be read

If the active runtime cannot access the private HQ repository, it must still apply the compact baseline in `YK_SYSTEMS_HQ.md`:

- relevant Executive Cabinet perspectives;
- Income & Asset Engine where commercial/growth considerations exist;
- Security & Production Readiness where technical/production risk exists;
- Design & UX Quality for user/customer-facing or visual work;
- Interaction Cost / Path Efficiency for meaningful user flows;
- the completion principle: **"It works" is not enough**;
- the priority rule: **ship smaller, not weaker**.

The local `YK_SYSTEMS_HQ.md` must also include these six completion-gate questions verbatim:

1. **Business/authority:** Is the work aligned with the current owner decision and commercial/operational objective?
2. **Execution:** Is the smallest coherent scope actually complete, testable and supportable?
3. **Security/reliability:** Are applicable security, privacy, failure-path, rollback and production-readiness checks verified?
4. **Design/UX:** Does the customer/user-facing result meet YK Systems' visual, usability, accessibility, trust and responsive-quality bar?
5. **Path efficiency:** Is the important happy path clear, and have avoidable clicks, decisions, fields, waits and dead ends been removed?
6. **Evidence:** What was tested/reviewed, what remains unverified, and what known debt or exception is being accepted?

These questions are the minimum local fallback for material completion review. They do not replace stricter project-specific gates.

If a material decision depends on current HQ state that cannot be verified, the agent must report the access limitation and stop/escalate rather than guess.

## MiroFish shared-tool routing

Every governed repository bootstrap must tell agents that MiroFish is a registered **shared YK Systems tool**, not a per-project dependency.

When material work depends on audience/customer/stakeholder reactions, objections, adoption behavior, pricing/offer response, onboarding/flow response, launch/message response or second-order multi-actor effects, agents must consider MiroFish automatically and invoke it when it would materially improve the evidence.

Synthetic output must remain labeled synthetic and cannot replace real demand/payment/user evidence.

If materially required but unavailable, report `MIROFISH_REQUIRED_BUT_UNAVAILABLE` rather than pretending an equivalent simulation occurred.

Canonical tool policy: `operations/tools/mirofish-shared-simulation-standard-v1.md`.

## Local policy relationship

Local project policy may be more specific or stricter than HQ policy. It may not weaken or silently bypass current HQ requirements.

Examples:

- a project may require stricter release gates, test coverage, offline behavior, or customer-data handling;
- a client repository may impose extra confidentiality or contractual constraints;
- a product may define a narrower allowed work sequence.

Those requirements compose with HQ. The stricter applicable requirement wins unless the owner explicitly decides otherwise.

## Security and repository separation

Referencing HQ does not authorize copying HQ secrets, client data, credentials, internal confidential payloads, or unrelated project content into another repository.

Public repositories should include only the compact governance baseline and canonical references, not private HQ operational data.

## New-repository gate

A new YK Systems repository must not be treated as fully active for material development until it has:

1. a YK Systems lane/owner;
2. a source-of-truth location;
3. a data/confidentiality boundary;
4. the required HQ governance bootstrap;
5. local project authority/instructions sufficient for the work;
6. a current status and next action.

## Immediate activation for ongoing work

Every governed repository must state that HQ governance is **effective immediately** for all open/in-progress work, including existing branches, pull requests, work items, release candidates and deliverables that began before the bootstrap was installed.

No open work is grandfathered. Before the next material action, the executor/reviewer must re-read the current bootstrap and re-gate the work against the six completion questions and any stricter local project rules.

Historical work already finally closed does not need to be reopened solely for this policy. If reopened, modified, re-released or used as the active basis for new work, current governance applies.

A live agent/session is not automatically refreshed by a Git commit. Therefore the repository policy must require the agent to reload current instructions before continuing material work, and current open PRs/work items should be explicitly notified where practical.

## Audit rule

HQ should periodically verify that active governed repositories still contain the bootstrap and that their references point to the current canonical standard.

A missing or stale bootstrap is a governance finding, not permission to ignore HQ.
