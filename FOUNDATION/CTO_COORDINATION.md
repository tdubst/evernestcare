# Evernest CTO Coordination

This document defines the operating layer for coordinating Evernest Family Care workstreams. It does not replace the scoped agent files in `FOUNDATION/agents/**`; it routes work to them and preserves product, privacy, and architecture boundaries.

## Role

`EFC - Product Planning` is the CTO and orchestration hub for Evernest Family Care.

It owns:

- roadmap sequencing
- sprint acceptance criteria
- cross-workstream routing
- final product tradeoffs
- review gates for sensitive work
- specialist thread seed prompts and status protocol

Specialist chats own bounded implementation or review within their assigned scope.

## Current Priority

Sprints 7-10 and the controlled Beta v0.1.0 package are accepted. The active gate is now production readiness for the first authenticated WebApp release. The accepted Beta remains unchanged while an isolated production-like staging project, production Auth, durable authorized/revoked proofs, release controls, operations drills, legal/privacy review, and final owner approvals are completed. Production promotion, real-user onboarding, storage/upload, sharing/export, live Native data, and monitoring expansion remain blocked until that gate closes.

The authoritative production artifacts are:

- `docs/architecture/production-readiness-gate.md`
- `docs/architecture/production-staging-runbook.md`
- `docs/architecture/production-operations-runbook.md`
- `.github/workflows/release-production.yml`
- `config/production-project-registry.json`

Historical sprint status follows.

Sprint 2 is complete as of June 3, 2026.

```text
create care subject -> log medication or vital -> read it back through RLS -> unrelated user denied
```

QA verified the Backend/Supabase gate with synthetic authenticated users, durable app user/team/recipient IDs, persisted `care_events`, authorized RLS read-back, unrelated-user read returning no rows, and unrelated-user write denial.

QA also verified the signed-in mobile WebApp proof path:

- `Persistence check` reached `Read back`
- no React hydration mismatch
- no favicon 404
- no relevant console errors
- no sensitive leakage in the status snippet

Security/Privacy cleared the user-facing persistence status surface for Sprint 2 closeout.

Sprint 3 hardening is accepted from the Product Planning gate as of June 4, 2026:

- `ensure_care_boundary` passed Architecture, Security/Privacy, Backend remote readiness, QA runtime verification, idempotency, fail-closed anon/unavailable paths, and mobile Today regression.
- `append_care_event` passed Backend implementation, direct table write lock, Architecture/Security review, remote migration readiness, authorized/duplicate/conflict/unauthorized validation, Today read-back, and privacy leakage checks.
- `hydrate_permission_context` passed Architecture/Security review, remote readiness, owner/unrelated-user proof, negative permission fixture proof, and Today regression.
- Today medication/vitals caregiver confidence passed Security/Privacy and signed-in mobile QA, including repeated vitals console cleanliness, reload preservation, care-note local-only guard, unrelated-user denial, and no sensitive proof/status leakage.

The first Sprint 4 caregiver confidence slice was accepted as of June 4, 2026. The Sprint 5 gate and implementation contract, Sprint 6 Durable Care Notes, and the Sprint 7-10 beta continuation policy were subsequently accepted. The historical sequencing below governed entry into Sprints 7-10; it is superseded by the production-readiness priority above.

- accepted Sprint 4 slice: Today-only generic active-workspace/access confidence plus medication/vitals continuity, Recent Updates, in-app Visit Prep confidence, care-note local-only guard, unrelated-user denial, and zero relevant console errors
- keep any remaining Sprint 4 polish narrow and Today-first
- keep provider sharing/export, external provider access, documents/messages, resource-scoped permission displays beyond accepted Sprint 7 scope, and Native implementation gated until their accepted sprint contracts
- defer real care profile/onboarding persistence until Product Planning approves a backend profile contract; Sprint 4 may show generic active-workspace confidence from the existing boundary, not persisted recipient labels or relationships
- treat Sprint 5 as the accepted permissions/sharing/provider-prep design-and-gate sprint
- use accepted `docs/architecture/sprint-5-resource-access-provider-prep-contract.md` as the implementation target for `hydrate_resource_access_context` and preview-only Provider Prep Review
- treat Sprint 6 Durable Care Notes as accepted; do not broaden its note scope into Provider Prep/share/export without a later contract
- use accepted `DECISIONS/008-resource-scoped-permissions-and-provider-prep-gates.md` as the Sprint 5/Sprint 6 gate record before any permissions-facing, sharing/export, provider externalization, documents/messages, invitations, durable care notes, or Native implementation
- continue automatically through Sprint 7-10 only if each prior sprint has recorded acceptance evidence and no P0 Security/Privacy, permissions, build, or golden-flow blocker remains
- use `docs/architecture/sprint-7-10-beta-continuation.md` plus the detailed Sprint 7, 8, 9, and 10 contracts as the implementation and acceptance target for Care Circle/Invitations, Vault/Documents, Native iOS baseline, and beta hardening

Use `FOUNDATION/SPRINT_3_READINESS_BACKLOG.md` as the durable record for Sprint 3 closeout and Sprint 4/Sprint 5 gate sequencing until a Sprint 4 backlog replaces it.

## Non-Negotiable Scope

No workstream should build or position Evernest as:

- diagnosis
- treatment recommendation
- clinical decision support
- EHR replacement
- telemedicine
- billing
- emergency response

Use calm coordination language such as organize, coordinate, log, remind, share, and prepare.

## Operating Model

- Product Planning owns priority, scope, acceptance criteria, and cross-chat sequencing.
- Backend Supabase owns service boundaries, persistence adapters, and integration contracts.
- Database-focused work owns Supabase migrations, seed data, append-only event storage, and RLS.
- WebApp owns current TanStack/Vite web beta UX and route-level integration.
- Native iOS/Android owns Expo planning and future mobile implementation under Evernest Family Care.
- Architecture owns boundary review, ADR needs, and stack-governance alignment.
- Security/Privacy owns privacy, permissions, auditability, unsafe medical claim review, and sensitive-data exposure review.
- QA owns golden-flow verification, mobile viewport checks, accessibility checks, and regression notes.
- UX owns calm, accessible, mobile-first caregiver experience and copy safety.

## Review Gates

- Changes touching permissions, RLS, auditability, sharing, documents, invitations, care copy, provider summaries, or exports require Security/Privacy review.
- Schema or RLS changes require Backend Supabase plus Database-focused review before implementation.
- Golden-flow changes require QA verification notes, including mobile viewport checks.
- Database changes must include migration summary, affected tables, RLS policy summary, rollback note, and seed-data safety note.
- Provider summary, share, or export changes require Security/Privacy review before implementation.
- Native work remains planning-only until web beta persistence is stable enough to share domain contracts.
- No broad stack migration may happen without the decision-record and migration-plan requirements in `FOUNDATION/ARCHITECTURE.md`.
- Sprint 4 caregiver confidence acceptance covers the first narrow scope: active boundary confidence, medication/vitals continuity, Recent Updates, and in-app Visit Prep preview. Any remaining Sprint 4 polish must stay within that scope.
- Sprint 5 permissions/sharing/provider-prep expansion requires separate Architecture, Security/Privacy, Backend, UX, and QA gates before implementation.
- Sprint 6 candidate expansion must be based on accepted Sprint 5 contracts. Do not start documents/messages/invitations/provider externalization/Native work directly from Sprint 4.
- Accepted `DECISIONS/008-resource-scoped-permissions-and-provider-prep-gates.md` records the contract-first policy for Sprint 5, QA evidence packet requirements, and the one-lane-at-a-time policy for Sprint 6.
- Accepted `DECISIONS/009-sprint-7-10-beta-continuation.md` records the post-Sprint-6 continuation policy. Automatic continuation means one-sprint-at-a-time execution after acceptance evidence, not skipped review gates or bundled feature expansion.
- Accepted `docs/architecture/sprint-6-durable-care-notes-closeout.md` records Sprint 6 completion and authorizes Sprint 7 entry.

## Thread Status Protocol

Every specialist chat should report back in this format:

```text
Workstream:
Current task:
Files inspected:
Intended change:
Affected golden flow:
Privacy / permissions impact:
Verification run:
Risks or blockers:
Recommended next step:
```

Every specialist prompt must also include this callback requirement:

```text
Callback requirement:
When this task is complete or blocked, send the status report back to Product Planning thread `019e8ef6-99ad-7f33-b752-9a9844a4a2f3`. Do not rely only on a final answer in this specialist thread.
```

## Historical Specialist Seed Prompts (Archived)

The prompts below preserve early-sprint coordination history and must not be used for current work. New specialist tasks must use the production-readiness artifacts listed under Current Priority, the current status protocol, and a scope tailored to the active production gate.

### Backend Supabase

```text
You are working in the Evernest Family Care project.

Workstream: Backend Supabase

Project root:
`/Users/TonyWan/Codex Projects/evernestcare`

Current priority:
Finish Sprint 2: Supabase Persistence + RLS Foundation.

Goal:
Prove one real persisted flow end to end:
create care subject -> log medication or vital -> read it back through RLS.

Start by reading:
- FOUNDATION/EVERNEST_SCOPE.md
- FOUNDATION/ARCHITECTURE.md
- FOUNDATION/NON_NEGOTIABLES.md
- FOUNDATION/PERMISSIONS_MODEL.md
- FOUNDATION/RLS_ARCHITECTURE.md
- FOUNDATION/agents/database-agent.md
- docs/architecture/supabase-persistence-foundation.md
- docs/architecture/health-events.md
- docs/architecture/collaborative-event-lineage.md

Constraints:
- Do not build diagnosis, treatment guidance, clinical decision support, EHR replacement, telemedicine, billing, or emergency response.
- Do not add tables without RLS design.
- Do not write PHI into logs, analytics, or audit metadata.
- Do not move files, rename folders, commit, deploy, or alter production config unless explicitly asked.
- Before editing, inspect relevant files and summarize the intended change.

Expected output:
- Migration/RLS status.
- What is already implemented.
- Gaps to finish real app user, care team, care recipient hydration.
- Exact implementation plan for persisting and reading one medication or vital event through RLS.
- Required seed/test data and verification steps.
```

### WebApp

```text
You are working in the Evernest Family Care project.

Workstream: WebApp

Project root:
`/Users/TonyWan/Codex Projects/evernestcare`

Current product state:
Sprint 1 Web Beta Stabilization is complete. Sprint 2 persistence foundation has started. The web app should remain mobile-first and beta-friendly while persistence is wired in.

Start by reading:
- FOUNDATION/EVERNEST_SCOPE.md
- FOUNDATION/NON_NEGOTIABLES.md
- FOUNDATION/DESIGN_SYSTEM.md
- FOUNDATION/GOLDEN_FLOWS.md
- FOUNDATION/agents/frontend-agent.md
- DECISIONS/004-mobile-first-policy.md
- docs/architecture/mobile-continuity-ux.md
- docs/architecture/navigation-continuity-model.md
- docs/architecture/caregiver-workflows.md

Constraints:
- Preserve calm caregiver UX.
- Avoid dashboard-heavy desktop behavior.
- Use family-friendly copy, not technical jargon.
- UI must not own durable domain rules or permissions logic.
- Before editing, inspect relevant files and summarize intended change.

Current implementation focus:
Support the Sprint 2 persisted flow from the UI without regressing prototype exploration:
create care subject -> log medication or vital -> read persisted event back through RLS.

Expected output:
- Current web flow map for Home/Today, medications, vitals, care notes, onboarding.
- UI gaps blocking the persisted proof flow.
- Proposed minimal UI changes.
- Mobile verification plan.
```

### Native iOS / Android

```text
You are working in the Evernest Family Care project.

Workstream: Native iOS / Android Alpha

Project root:
`/Users/TonyWan/Codex Projects/evernestcare`

Important:
Native iOS is a workstream under Evernest Family Care, not a separate product.

Start by reading:
- FOUNDATION/EVERNEST_SCOPE.md
- FOUNDATION/ARCHITECTURE.md
- FOUNDATION/NON_NEGOTIABLES.md
- FOUNDATION/agents/mobile-agent.md
- DECISIONS/004-mobile-first-policy.md
- docs/architecture/hipaa-ready-beta-productization.md
- docs/architecture/mobile-continuity-ux.md
- docs/architecture/navigation-continuity-model.md

Current priority:
Do not outrun web beta or Sprint 2 persistence. Prepare Native iOS/Android Alpha planning under `apps/mobile` with Expo React Native and shared domain logic where practical.

Constraints:
- No Capacitor wrapper unless a future architecture decision changes direction.
- No mobile-only domain divergence.
- No PHI in push text, crash logs, or analytics.
- Native capabilities to plan: secure storage, native share sheet, camera/document scanner, Apple Health permission flow.
- Before editing, inspect relevant files and summarize intended change.

Expected output:
- Mobile alpha readiness checklist.
- Shared-domain candidates.
- Native-specific risk list.
- Recommended first mobile implementation slice after web beta persistence is stable.
```

### Architecture

```text
You are working in the Evernest Family Care project.

Workstream: Architecture

Project root:
`/Users/TonyWan/Codex Projects/evernestcare`

Role:
Protect architecture coherence and prevent feature work from outrunning foundations.

Start by reading:
- FOUNDATION/EVERNEST_SCOPE.md
- FOUNDATION/ARCHITECTURE.md
- FOUNDATION/NON_NEGOTIABLES.md
- FOUNDATION/FOUNDATIONAL_IMPLEMENTATION_PLAN.md
- FOUNDATION/AGENT_INHERITANCE_MAP.md
- DECISIONS/001-stack-freeze.md
- DECISIONS/004-mobile-first-policy.md
- DECISIONS/006-ai-governance.md
- docs/architecture/

Current priority:
Review Sprint 2 persistence and RLS work for architecture alignment.

Constraints:
- No broad stack migration.
- No hidden Next.js, Expo, Supabase, Vercel, Sentry, PostHog, or Storybook setup without decision record.
- Product screens must not own durable domain rules.
- Server state belongs behind typed contracts.
- Supabase access must flow through typed adapters and RLS.

Expected output:
- Architecture risks in current Sprint 2 path.
- Required ADRs or docs before future work.
- Boundaries between web, backend, database, permissions, and mobile.
- Decision-ready recommendation for the next beta milestone.
```

### Security / Privacy

```text
You are working in the Evernest Family Care project.

Workstream: Security / Privacy

Project root:
`/Users/TonyWan/Codex Projects/evernestcare`

Start by reading:
- FOUNDATION/EVERNEST_SCOPE.md
- FOUNDATION/NON_NEGOTIABLES.md
- FOUNDATION/PERMISSIONS_MODEL.md
- FOUNDATION/PERMISSIONS_RUNTIME.md
- FOUNDATION/RLS_ARCHITECTURE.md
- FOUNDATION/agents/security-agent.md
- DECISIONS/006-ai-governance.md
- docs/architecture/hipaa-ready-beta-productization.md
- docs/architecture/export-share-model.md
- docs/architecture/visibility-boundaries.md

Current priority:
Review Sprint 2 persistence/RLS and upcoming provider summary/share flows for privacy and permission safety.

Constraints:
- No PHI in logs, analytics, crash reports, AI prompts, or session replay.
- No unsafe medical claims.
- No diagnosis, treatment, clinical decision support, EHR replacement, telemedicine, billing, or emergency response positioning.
- Invitations, role changes, sharing, export, upload, delete, and revoke behavior must be auditable in future persistence.

Expected output:
- Privacy risk review.
- RLS/permissions review checklist.
- Copy safety notes.
- Required audit events or future hardening items.
```

### QA

```text
You are working in the Evernest Family Care project.

Workstream: QA

Project root:
`/Users/TonyWan/Codex Projects/evernestcare`

Start by reading:
- FOUNDATION/GOLDEN_FLOWS.md
- FOUNDATION/NON_NEGOTIABLES.md
- FOUNDATION/agents/qa-agent.md
- DECISIONS/004-mobile-first-policy.md
- docs/architecture/beta-readiness-principles.md
- docs/architecture/mobile-continuity-ux.md

Current priority:
Define verification for Sprint 2 persisted Supabase/RLS flow and protect Sprint 1 Web Beta Stabilization.

Hosted test link:
https://evernestcare.vercel.app/today

Constraints:
- Mobile viewport checks are required for core flows.
- Accessibility is required.
- Golden-flow changes need regression notes.
- Do not expand product scope while testing.

Expected output:
- Current test inventory.
- Missing tests for create care subject -> log medication/vital -> read back through RLS.
- Manual and automated acceptance checklist.
- Regression checklist for Home/Today, Medications, Vitals, Visit Prep, Vault, Calendar, Messages, and Circle.
```

### UX

```text
You are working in the Evernest Family Care project.

Workstream: UX

Project root:
`/Users/TonyWan/Codex Projects/evernestcare`

Start by reading:
- FOUNDATION/DESIGN_SYSTEM.md
- FOUNDATION/NON_NEGOTIABLES.md
- FOUNDATION/agents/ux-agent.md
- DECISIONS/004-mobile-first-policy.md
- DECISIONS/005-design-philosophy.md
- docs/architecture/mobile-continuity-ux.md
- docs/architecture/onboarding-philosophy.md
- docs/architecture/caregiver-workflows.md
- docs/architecture/visit-prep-workflow.md

Current priority:
Keep beta workflows calm, mobile-first, and understandable while persistence and real user/team/recipient state are added.

Constraints:
- Calm UX over feature density.
- No dashboard overload.
- No harsh medical visual language.
- Care copy should use organize, coordinate, log, remind, share, prepare.
- Avoid diagnose, prescribe, treat, monitor as a medical service, clinically validate, replace provider judgment.

Expected output:
- UX review of Sprint 2 persisted flow.
- Mobile-first onboarding and care-subject creation recommendations.
- Copy safety notes.
- Accessibility and one-handed-use risks.
```

## Current Thread-Control Requirement

Direct cross-chat coordination requires existing Codex thread IDs or links for each specialist workstream. Once those are available, Product Planning can send scoped follow-up prompts to the specialist chats and track their returned status using the protocol above.

Specialist chats must proactively report completion or blocker status back to Product Planning thread `019e8ef6-99ad-7f33-b752-9a9844a4a2f3`. The blocker monitor is a fallback, not the primary handoff path.

## Codex Thread Roster

Use these thread IDs for direct CTO coordination from Product Planning:

| Workstream       | Thread ID                              |
| ---------------- | -------------------------------------- |
| Product Planning | `019e8ef6-99ad-7f33-b752-9a9844a4a2f3` |
| Backend Supabase | `019e8ef6-9e6a-79a3-8b85-787b29dc80b5` |
| Web App          | `019e8ef6-9b0f-7f22-97ec-5c20164b6220` |
| Native iOS       | `019e8ef6-9cd1-7832-85b6-84293be284f0` |
| Architecture     | `019e8ef5-95d9-7523-9c2c-00ba4f36fff7` |
| QA Release       | `019e8ef6-a3bc-70f0-ba54-dbe5d9d556dc` |
| Caregiver UX     | `019e8ef6-a00e-7552-bf29-d26e32abd6fd` |
| Agents           | `019e8ef6-a1fe-7472-a392-1a402631afe1` |
| Decisions        | `019e8ef6-a659-7663-9bad-913e215927a3` |
| Starter          | `019e8eef-14a3-75a2-a74e-da808e3ddc7b` |
