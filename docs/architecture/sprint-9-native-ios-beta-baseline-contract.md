# Sprint 9 Native iOS / Mobile Beta Baseline Contract

Status: Accepted for planning

## Purpose

Sprint 9 makes Native iOS / Expo beta-ready as an Evernest workstream without broadening the product scope. The first proof is auth/session readiness, safe signed-out states, sign-out cleanup, and read-only continuity.

## Implementation Target

- Stabilize `apps/mobile` around auth readiness, safe areas, secure token storage, sign-out cleanup, and read-only continuity.
- Reuse shared domain, permission, Supabase, and redaction conventions where practical without a broad monorepo migration.
- Prepare TestFlight readiness: Expo config, permission copy, EAS build plan, mobile QA checklist, crash/logging privacy stance, and known limitations.
- Keep Native iOS under Evernest Family Care, not a separate product.

## Required Contracts And Boundaries

- Native writes are out of scope unless separately reviewed; first proof is read-only continuity or safe deferred states.
- Sign-out must clear sensitive local session state and any cached continuity data introduced by Sprint 9.
- No PHI in crash logs, console output, push text, screenshots, QA evidence, analytics, or session replay.
- Apple Health, camera/document scanner, Native share sheet, offline cache beyond sign-out cleanup, push notifications with care details, and native provider externalization are deferred until separate accepted contracts.
- Native must preserve web/backend permission semantics; UI grants remain advisory and RLS/RPC remains authority.

## UX Requirements

- Mobile screens must respect safe areas, reachable controls, and readable states on iPhone-class viewports.
- Signed-out/deferred states must be complete and non-dead: clear sign-in path or clear explanation of unavailable beta capability.
- Copy must avoid diagnosis, treatment, emergency, EHR, billing, provider approval, or clinical decision-support language.

## QA Acceptance

- Expo/native typecheck/build path is repeatable and recorded.
- Native app shows authenticated read-only continuity or safe signed-out/deferred states.
- Permission-denied and signed-out states are generic and content-free.
- Sign-out cleanup removes sensitive local state introduced by the mobile proof.
- TestFlight readiness checklist is complete with EAS build plan, permissions copy, privacy copy, known limitations, and beta QA checklist.
- No PHI appears in crash logs, console output, push text, screenshots, or QA evidence.

## Continuation Gate

Sprint 10 may start only after Sprint 9 records acceptance evidence and has no P0 Security/Privacy, permissions, mobile build, sign-out cleanup, or golden-flow blocker.
