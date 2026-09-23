# 007: Sprint 2 Persistence Scaffolding

Status: Accepted

## Context

Sprint 2 proved the core Supabase persistence and RLS boundary for Evernest Family Care:

```text
create care subject -> log medication or vital -> read it back through RLS -> unrelated user denied
```

QA verified the backend/Supabase gate with synthetic authenticated users on June 3, 2026. The proof showed durable app user, care team, and care recipient IDs; a persisted `care_events` row; authorized RLS read-back; unrelated-user read returning no rows; and unrelated-user write denial.

The current implementation still uses client-side care boundary hydration and a direct typed `care_events` upsert adapter. Architecture and Security/Privacy classified that path as acceptable Sprint 2 proof scaffolding, but not the final beta hardening model.

## Decision

Accept the current client hydration and direct `care_events` upsert path as Sprint 2 proof scaffolding only.

Do not use this acceptance to start broad Sprint 3 feature expansion. Sprint 3 may proceed first through hardening and UI proof work that makes the existing persistence boundary testable and visible without exposing sensitive details.

## Boundaries

- Supabase RLS remains the enforcement authority.
- Client-side grants are advisory UI hints only.
- Product screens must not own durable permission rules.
- Persistence must continue to flow through typed repository/adapters.
- QA evidence must use synthetic data and report record IDs/status only, not payload contents.
- No diagnosis, treatment recommendation, clinical decision support, EHR replacement, telemedicine, billing, or emergency response scope is introduced by this decision.

## Required Follow-Ups

- Add or expose a signed-in WebApp proof path so QA can complete the flow from the UI on mobile.
- Add a non-sensitive persistence/read-back status signal for QA and beta operators.
- Plan transactional `ensure_care_boundary` and `append_care_event` server/RPC hardening before broader beta.
- Hydrate real permission/grant state before permissions-facing feature expansion.
- Keep provider summary, sharing, export, invitations, and role changes behind Security/Privacy review.

## Consequences

Sprint 2 backend/Supabase acceptance can be recorded as passed, but Sprint 3 feature work remains gated until Product Planning explicitly clears the WebApp proof and hardening path.

This avoids blocking on full RPC hardening while keeping the temporary client bootstrap/upsert model visible and bounded.
