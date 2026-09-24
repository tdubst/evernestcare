# 008: Resource-Scoped Permissions and Provider Prep Gates

Status: Accepted

## Context

Sprint 3 hardened the active care boundary, event append, direct-write lock, and server-derived advisory permission hydration. Sprint 4 is scoped to Today-first caregiver confidence: active workspace readiness, medication/vitals continuity, Recent Updates, and in-app Visit Prep preview.

Sprint 5 and Sprint 6 will touch higher-risk surfaces: permissions-facing UI, provider-prep review, sharing/export, documents, messages, invitations, durable notes, and Native. Broad advisory grants are not enough to prove access to a specific document, message, conversation, packet, note, or share target.

## Decision

Sprint 5 is a contract-and-gate sprint before broad feature expansion.

Before any permissions-facing UI, external sharing/export, provider-prep externalization, documents/messages visibility, invitations/role changes, durable care notes, or Native expansion, Evernest must define and accept:

- a resource-scoped access projection contract
- a provider-prep/share-intent review contract if provider-prep becomes user-facing beyond the current in-app preview
- audit action and metadata allowlists
- revocation, expiry, stale-membership, archived-boundary, and fail-closed behavior
- Security/Privacy and QA evidence rules

The first Backend candidate is a server-derived resource access projection, working name `hydrate_resource_access_context`. It extends the Sprint 3 permission model without replacing RLS/RPC authority.

The only acceptable Sprint 5 user-facing proof, if Product Planning chooses one, is an in-app read-only Provider Prep Review / share-intent preview with no external delivery, no public link, no token, no email, no provider portal, no PDF/download, and no Native share sheet.

Before implementation, Architecture, Backend, and Security/Privacy must define the exact `hydrate_resource_access_context` contract:

- RPC inputs and defaults
- whether callers may pass requested resource IDs
- maximum requested resource IDs and page size
- closed vocabulary for resource types, capabilities, access states, source scopes, expiry semantics, and audit action names
- allowlisted resource classes and capabilities for the first proof
- deterministic precedence for role defaults, explicit grants, explicit denies, expired grants, revoked grants, and stale permission versions
- non-ready response shape for unauthorized, unknown, archived, unrelated, stale, multiple-membership, or ambiguous resources
- provider-prep/share-intent input and output boundaries
- audit metadata allowlist
- cache, revision, and permission-version semantics
- QA evidence format

## Required Resource Projection Shape

The resource projection may return only allowlisted metadata:

- stable status
- active boundary identifiers required by the client contract
- membership status and role key where already safe
- permission version or revision marker
- resource access summaries such as `{resource_type, resource_id|null, capability, access, source_scope, expires_at|null}` only when safe

It must not return raw grant rows, grant reasons, emails, full user rows, recipient labels, relationship labels, care-team roster labels, document titles, message metadata, provider details, event payloads, note text, raw SQL/RPC errors, tokens, secrets, share tokens, invitation tokens, or unauthorized resource identifiers.

For non-ready, revoked, expired, stale, archived, denied, unavailable, or mismatched states, the projection must fail closed with empty resource summaries and null resource identifiers. It must not leak unauthorized resource existence through IDs, counts, titles, labels, metadata, timing text, or raw errors.

## Required Provider Prep / Share-Intent Contract

Provider-prep review must be deterministic, factual, timeframe-bound, source-visible, and coordination-only.

Allowed first proof:

- authenticated active-boundary path
- medication/vitals-derived Recent Updates and Visit Prep content only
- content category list
- timeframe
- source labels such as `Source: Recent Updates`
- per-row source and inclusion labels such as `Included from Recent Updates`, `Not included`, or `Not shared`
- copy such as `Review for Visit Prep`, `Not shared yet`, and `For coordination only`
- preview-only CTA labels such as `Review preview`, `Close preview`, or `Return to Visit Prep`
- explicit confirmation that no external sharing/export/provider access has occurred

Not allowed until a later reviewed contract:

- CTA labels or actions that imply external delivery or access, including `Continue`, `Share`, `Share now`, `Send`, `Download`, `Export`, `Invite provider`, or `Grant access`
- email, PDF, public/provider links, tokens, provider portal access, Native share sheet, documents, messages, durable care notes, profile labels, external delivery, or provider account behavior
- clinical claims such as diagnosis, treatment guidance, risk scoring, normal/stable/target-range interpretation, provider approval, EHR replacement, telemedicine, billing, or emergency response

## Verification Gates

Acceptance requires:

- Architecture acceptance of the data flow, resource scope, revocation/expiry model, and audit taxonomy
- Backend proof with synthetic fixtures for owner/primary/family/viewer/provider aliases where applicable, explicit allow, explicit deny overriding role/default allow, expired grant ignored, revoked grant ignored, unrelated user denied, archived team/recipient denied, multiple active memberships fail closed, restricted versus unrestricted placeholder resources, removed conversation participant, unauthorized requested resource ID returning no ID/detail, and audit-read denial
- Security/Privacy review confirming no sensitive data in status surfaces, logs, audit metadata, console output, analytics, crash reports, URLs, QA evidence, or AI prompts
- UX review confirming factual coordination copy, explicit preview/confirmation states, and no misleading access claims
- QA proof on mobile with authorized success, unauthorized/revoked/expired fail-closed behavior, console cleanliness, leakage scan, and no external delivery for preview-only flows
- provider-prep/share-intent evidence that uses synthetic or redacted content only, and avoids screenshots/logs/snippets that expose medication values, vitals values, notes, payloads, labels, or other workflow details outside the intended in-app review surface

## QA Acceptance Evidence

Sprint 5 cannot be treated as executable until the concrete implementation contract defines the exact evidence packet QA will collect.

Required evidence fields:

- feature path and scope
- synthetic fixture aliases only
- viewport and platform
- build, lint, and focused test status
- authorized success status
- unauthorized, revoked, expired, stale, archived, malformed, and unrelated-user denial statuses
- resource class and capability keys only
- provider-prep/share-intent preview status
- no-external-delivery status
- audit metadata key summary
- console and leakage scan summary
- accessibility/mobile smoke summary

Required resource projection negative cases:

- stale permission version or revision mismatch
- mixed authorized and unauthorized requested resource list
- malformed or unknown resource type
- malformed or unknown capability
- pagination or max-request boundary
- duplicate requested resource IDs
- null or empty requested resource list
- archived resource if resource archival is separate from archived team/recipient
- denied resources cannot be read or written through the underlying RPC/RLS path

Required provider-prep/share-intent cases:

- included medication/vitals item
- explicitly excluded category
- empty preview
- timeframe boundary
- stale, revoked, or denied access before preview
- no share token, public URL, export, download, provider access, external delivery, or delivery audit event created

Required mobile, accessibility, console, and leakage assertions:

- primary mobile proof at `390x844`
- readable status and preview surfaces
- no overlapping text
- reachable tap targets
- keyboard and focus path where practical
- status copy understandable without color alone
- zero relevant app console errors or warnings
- no screenshots, snippets, logs, or evidence fields exposing labels, titles, payloads, note text, medication values, vitals values, emails, IDs, tokens, raw errors, provider details, document/message contents, or unauthorized resource details

Required audit evidence:

- audit metadata contains only allowlisted status, action, resource-class, timeframe, expiry, revision, and result metadata
- audit metadata does not contain labels, titles, payloads, user details, emails, tokens, note text, medication/vitals values, provider details, document/message content, raw errors, grant reasons, or unauthorized resource details

## Consequences

Sprint 4 may continue without new backend contracts because it stays inside active workspace confidence and medication/vitals continuity.

Sprint 5 must not become a broad implementation sprint. It should produce accepted contracts and, at most, one narrow proof.

Sprint 6 may choose one broader expansion lane only after Sprint 5 gates pass. Candidate lanes include Documents/Vault, Messages, Invitations/Care Team, Provider externalization, Durable care notes, or Native. Each lane needs its own implementation plan, Security/Privacy review, and QA proof before acceptance.
