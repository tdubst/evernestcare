# Sprint 3 Hardening Contracts

This note records the design direction for hardening the Sprint 2 persistence scaffolding accepted in `DECISIONS/007-sprint-2-persistence-scaffolding.md`.

It is not an implementation authorization. Sprint 3 feature expansion remains gated by Product Planning, QA, Architecture, and Security/Privacy.

## Scope

These contracts harden three boundaries:

- transactional care boundary bootstrap
- server-side care event append
- real permission/grant hydration

They preserve Evernest as a family care coordination product. They must not introduce diagnosis, treatment guidance, clinical decision support, EHR replacement, telemedicine, billing, or emergency response behavior.

## `ensure_care_boundary`

`ensure_care_boundary` should replace the current multi-step client bootstrap when Product Planning authorizes implementation.

### Purpose

Create or reuse the authenticated user's durable Evernest boundary in one transaction:

- app user
- care recipient
- care team
- active membership
- recipient/team alignment

### Client Inputs

Allowed client inputs:

- recipient display/profile label when needed for first-run setup
- relationship context when needed for coordination copy
- optional requested care recipient ID for future recipient switching

Disallowed client inputs:

- actor user ID
- auth user ID
- first-run care team ID
- role ID
- privileged capability fields
- trusted audit metadata

### Server-Derived Fields

The RPC derives:

- `auth.uid()`
- app user row
- owner or active membership role
- care team and recipient alignment
- active membership status
- permission revision or equivalent non-sensitive version marker

### Result Shape

The RPC should return one non-sensitive row:

- `app_user_id`
- `active_care_team_id`
- `active_care_recipient_id`
- `membership_id`
- `role_key`
- `membership_status`
- `created_user`
- `created_recipient`
- `created_team`
- `created_membership`
- `permission_version`
- stable status code

Do not return emails, recipient labels, user display names, onboarding free text, payloads, tokens, raw grant reasons, or care details.

### Idempotency And Concurrency

Use `auth.uid()` and active membership lookup as the idempotency anchor.

Use a transaction-level advisory lock keyed by the authenticated user to prevent duplicate first-run care boundaries from concurrent tabs or retries.

Retries must be safe:

- if the transaction committed, retry returns the existing boundary
- if it rolled back, retry creates the boundary once

### Failure Behavior

The operation is transactional. It either creates and links all required rows or commits none of them.

It must handle these states with deterministic, non-sensitive status codes:

- unauthenticated user
- revoked, suspended, or deleted app user
- archived team
- archived recipient
- multiple active memberships
- unavailable boundary
- retryable conflict

### RLS And Security Posture

The implementation may use a `SECURITY DEFINER` RPC with `set search_path = public`, executable only by authenticated users.

The function may bypass row policies internally only to complete the authenticated user's own boundary. It must enforce `auth.uid()`, active status, and membership/role assumptions deliberately. The client must never receive a service-role key.

### Audit And Logging

Audit metadata must be allowlisted. It may include action type, status, role ID/key, resource type, resource ID, and non-sensitive revision/status markers.

Audit metadata must not include email, recipient labels, user display names, onboarding free text, payloads, medication labels, vitals values, notes, document titles, provider details, or raw errors.

## `append_care_event`

`append_care_event` should replace direct client `care_events` upsert before broader beta or permissions-facing expansion.

### Purpose

Append one typed operational care event while deriving trust-sensitive attribution and authorization server-side.

### Client Inputs

Allowed client inputs:

- `care_team_id`
- `care_recipient_id`
- `client_event_id`
- `event_type`
- `event_source`
- `occurred_at`
- `operational_context`
- `correlation_id`
- `causation_id`
- `schema_version`
- typed `payload`

The payload remains care data and must not be logged, copied into audit metadata, or returned in status evidence.

### Server-Derived Fields

The RPC derives:

- `actor_user_id` from the authenticated app user
- actor display attribution from the app user row
- actor role from active membership and role mapping
- team/recipient authorization from RLS helpers and membership state
- event capability from `care_event_required_capability`

Unsupported or inactive roles must fail closed.

### Validation

Validation is structural only. It may check:

- allowed event type
- allowed event source
- schema version
- required keys
- scalar types
- timestamp sanity
- payload size limits
- enum membership

Validation must not assess clinical correctness, normal or abnormal ranges, medication appropriateness, treatment significance, risk, diagnosis, or provider judgment.

### Idempotency

Preserve uniqueness by `(care_team_id, client_event_id)`.

On duplicate with matching command fields, return the existing row as `duplicate`.

On duplicate mismatch, fail with a generic conflict status and do not return payload details.

### Result Shape

Return non-sensitive metadata only:

- `status` such as `inserted` or `duplicate`
- `care_event_id`
- `client_event_id`
- `care_team_id`
- `care_recipient_id`
- `event_type`
- `occurred_at`
- `schema_version`
- `created_at`
- `read_back`

Do not return payload, medication labels, vitals values, note text, artifact titles, recipient labels, display names, raw grant reasons, SQL errors, or unauthorized resource IDs.

### Failure Behavior

Unauthorized append must fail closed with generic status. The response must not reveal whether team, recipient, membership, capability, role, or resource existence caused the denial.

### Audit And Logging

Event append audit metadata should be limited to:

- event type
- event source
- schema version
- idempotency outcome/status
- client event ID only if treated as non-guessable operational metadata

Never include payload, free text, emails, recipient labels, medication labels, vitals values, document titles, provider details, tokens, or raw errors.

## Permission Hydration

Permission hydration should replace placeholder/advisory grant state before permissions-facing expansion.

### Source Of Truth

The server derives advisory client capabilities from:

- `care_team_members`
- `roles`
- `permission_grants`
- `evernest_role_allows`
- `has_team_capability`
- `has_resource_capability`
- active, revoked, expired, and denied grant semantics

RLS remains the enforcement authority. UI grants are only hints.

### Result Shape

Hydration may be part of `ensure_care_boundary` or a separate `hydrate_permission_context` RPC.

Return:

- `app_user_id`
- `active_care_team_id`
- `active_care_recipient_id`
- `membership_id`
- `role_key`
- `membership_status`
- advisory `capabilities`
- optional denied capability keys when safe
- `permission_version`
- stable status code

Do not return raw grant reasons, emails, full user rows, invitation details, document/message metadata, event payloads, tokens, or care details.

### Stale, Revoked, And Unavailable States

Refresh permission context on:

- auth state change
- app focus
- RPC denial
- membership update
- grant update
- invitation or role change

If membership is revoked, expired, unavailable, or denied, the client should fail closed:

- clear or limit advisory capabilities
- disable durable write actions
- show non-sensitive unavailable/checking status
- preserve local reducer UX only where safe
- never claim persisted success without server confirmation

## Stable Error Codes

RPCs should return or throw stable non-sensitive codes only:

- `auth_required`
- `boundary_unavailable`
- `user_unavailable`
- `multiple_active_memberships`
- `permission_denied`
- `validation_failed`
- `duplicate_event`
- `conflict`
- `retry_later`

Do not expose SQL error text, table names, policy names, unauthorized IDs, payload fragments, user emails, care labels, invitation tokens, provider details, or document details.

## Verification Requirements

Before broader beta or permissions-facing expansion:

- unauthorized read and write tests
- revoked membership tests
- expired grant tests
- deny-overrides-allow tests
- archived recipient/team tests
- cross-team isolation tests
- duplicate event tests
- retry/idempotency tests
- no-PHI logging and audit metadata checks

Provider summary, sharing, export, invitations, and role-change behavior need separate Security/Privacy review before implementation.
