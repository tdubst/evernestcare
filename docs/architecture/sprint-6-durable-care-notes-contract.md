# Sprint 6 Durable Care Notes Contract

Status: Draft

## Purpose

Sprint 6 first lane is Durable Care Notes, Today-first.

This contract is the implementation target only after Sprint 5 runtime proof, Security/Privacy, QA, and Product Planning acceptance are complete:

```text
authenticated active boundary -> advisory note access -> append CareNoteAddedEvent -> read back through RLS -> reload shows note in Today/Recent Updates
```

It does not authorize documents, messages, invitations, Care Team management, provider externalization, sharing/export/download, Native, profile labels, Calendar persistence, task persistence, or destructive note edit/delete workflows.

## Source Decisions

- `DECISIONS/003-permissions-philosophy.md`
- `DECISIONS/008-resource-scoped-permissions-and-provider-prep-gates.md`
- `docs/architecture/sprint-5-resource-access-provider-prep-contract.md`
- `docs/architecture/supabase-persistence-foundation.md`

## Capability Vocabulary

First-proof resource type:

- `care_recipient`

First-proof note capabilities:

- `care_note.append`
- `care_note.view`

`care_note.append` is the normalized capability name for adding a new immutable note event. Existing references to `care_note.create` should be migrated or explicitly mapped to `care_note.append` before implementation so Backend, WebApp, QA, and Security use one vocabulary.

First implementation may keep an internal compatibility mapping from `care_note.create` to `care_note.append` only long enough to preserve existing helper behavior. Product/UI output, `hydrate_resource_access_context`, QA evidence, and new contract language must use `care_note.append`.

`care_note.view` is distinct from broad `care_event.view`. A user may have medication/vitals continuity access without note text access. Note text must only hydrate when `care_note.view` is allowed for the active `care_recipient` boundary.

`hydrate_resource_access_context` should surface note access as recipient-scoped advisory rows, for example:

```json
{
  "resource_type": "care_recipient",
  "resource_id": null,
  "capability": "care_note.append",
  "access": "allowed",
  "source_scope": "role_default",
  "expires_at": null
}
```

RLS/RPC remains authoritative. Advisory access must not be treated as a security boundary.

## Server Boundary

First proof should extend the existing `care_events` / `append_care_event` / read-back model for `CareNoteAddedEvent`. Do not introduce a separate note-specific RPC unless implementation review finds a concrete need that the shared event RPC cannot meet.

Server requirements:

- derive actor, app user, membership, role, active care team, and active care recipient server-side
- enforce active boundary, recipient/team alignment, revocation, expiry, archived/deleted state, and explicit deny
- require `care_note.append` for `CareNoteAddedEvent`
- keep idempotency by `(care_team_id, client_event_id)` or the already accepted care-event idempotency pattern
- reject duplicate same-command safely and reject duplicate mismatches without leaking note text
- preserve append-only event history

No edit, destructive delete, redaction, or correction workflow is included. If correction is needed later, it must be append-only and separately reviewed.

## Note Payload

Accepted event:

- `event_type`: `CareNoteAddedEvent`
- `schema_version`: `1`
- `event_source`: `manual`
- `operational_context`: `caregiver-note`
- `payload.note`: trimmed, non-empty text
- `payload.noteType`: one of `caregiver-context`, `operational-concern`, `symptom-observation`, `recovery-observation`

Validation requirements:

- reject empty or whitespace-only note text
- enforce max note length of 2,000 trimmed characters
- enforce max serialized payload size of 8 KB
- accept notes at or under the 2,000-character trimmed text limit when all other validation passes
- reject notes over 2,000 trimmed characters with stable `note_too_long` or equivalent reviewed safe status
- reject payloads over 8 KB with stable `payload_too_large` or equivalent reviewed safe status
- reject unknown `noteType`
- reject non-manual sources until separately cleared
- reject invalid schema version
- enforce `occurred_at` not more than 5 minutes in the future and not more than 30 days in the past for the first proof
- return stable safe statuses for malformed, oversized, disallowed type/source, stale boundary, unauthorized, duplicate mismatch, and unavailable cases
- never echo rejected note text or payload details in validation errors

Validation must remain structural only. Do not validate clinical correctness, diagnose, triage, score risk, judge normality, recommend treatment, or infer provider intent.

## Read Hydration

First proof should hydrate durable notes only into intended authorized workflow surfaces:

- Today
- Recent Updates
- note/timeline rows inside the active care boundary

After reload, an authorized user should see one note row with actor attribution, timestamp, note type, and note text in the intended timeline surface.

Notes remain excluded from Provider Prep, Share Intent, export/download, provider access, provider summaries, documents, messages, and status/proof/debug/access cards in the first proof. If Product/Security later accept Provider Prep note inclusion, that requires a separate contract.

First-proof pass/fail assertion: durable notes must be absent from Provider Prep, Share Intent, export/download, provider-access, provider-summary, document, and message surfaces. No share/export/provider-delivery audit action may be created because of a durable note.

## Audit And Logging

First-proof audit action keys:

- `care_note_append_requested`
- `care_note_created`
- `care_note_read_back`
- `care_note_hydrated`
- `care_note_denied`
- `care_note_append_rejected`

Audit metadata may include only:

- action key
- status/result
- resource class/type
- capability key
- event type
- note type key
- schema version
- source
- revision marker
- idempotency outcome

Client event ID should be omitted from audit metadata unless Security/Privacy explicitly approves a non-reversible hash. Never store raw client event IDs in QA evidence.

Audit metadata, logs, status surfaces, proof snippets, analytics, crash reports, AI prompts, session replay, and console output must not include:

- note text or snippets
- raw payload JSON
- labels or titles
- user display names
- emails
- provider details
- raw SQL/RPC errors
- grant reasons
- tokens
- URLs
- share/export/provider-delivery metadata
- unauthorized resource details

## UX Boundaries

The first UI path is Today-only:

- add a care note
- show save/read-back/reload confidence without note text in status copy
- show the note only in the authorized timeline/recent-update surface

Composer requirements:

- place the entry in or directly adjacent to Recent Updates / Family activity after active workspace/access confidence is ready
- use one visible labeled note field
- allow optional note type labels only for the accepted note type keys
- primary action: `Add note`
- secondary action: `Cancel` or `Close`
- no edit, delete, redaction, correction, provider, document, message, invitation, share, export, or Native action
- on `390x844`, the keyboard must not hide the note field or `Add note` action
- if implemented as a sheet or modal, focus order and close behavior must be explicit
- status cannot rely on color alone
- long note text must wrap or truncate without horizontal scrolling

Allowed status copy:

- draft: `Care note draft` / `Not saved yet`
- saving: `Saving note` / `Checking the care workspace before saving.`
- saved: `Note saved` / `Saved without showing note text in status.`
- read-back: `Note saved to Recent Updates` / `Read back through the signed-in care boundary.`
- reload: `Saved care note restored` / `Recent Updates includes saved care notes for this workspace.`
- unavailable: `Saving unavailable` / `This note is visible in this session, but has not been saved for reload.`
- denied: `Cannot save note` / `Access changed. The note was not saved.`

Allowed copy should frame notes as care coordination context. It must not use diagnostic, treatment, clinical validation, provider approval, telemedicine, billing, emergency, or EHR-replacement language.

Provider Prep may show no note content. A value-safe exclusion count may be considered only if Product and Security/Privacy explicitly approve it.

## QA Acceptance

Required proof:

- authorized append succeeds
- read-back succeeds through RLS/client adapter
- reload shows one note in Today/Recent Updates
- no duplicate row or duplicate key warning
- unrelated user denied
- revoked membership denied
- expired grant ignored or denied according to the accepted permission fixture
- revoked grant ignored or denied according to the accepted permission fixture
- archived team denied
- archived recipient denied
- stale permission version denied
- explicit deny overrides role/default/explicit allow
- multiple active memberships fail closed if the active-boundary model can produce that state
- malformed, oversized, empty, disallowed `noteType`, disallowed source, and invalid schema version rejected
- note under the max length accepted when otherwise valid
- note at the max length accepted when otherwise valid
- note over the max length rejected with stable safe status and no note echo
- payload over the max size rejected with stable safe status and no payload echo
- duplicate same-command idempotency and duplicate mismatch behavior verified
- authenticated client direct `care_events` insert denied
- authenticated client direct `care_events` update denied
- authenticated client direct `care_events` delete denied
- only the approved server RPC path may append durable notes
- note text absent from logs, audit metadata, status/proof snippets, screenshots intended as evidence, console output, network snippets, and QA report text
- Provider Prep/Share Intent/export/provider access do not include durable notes
- no share/export/provider-delivery audit actions are created
- mobile `390x844` smoke, readable timeline row, accessible controls, keyboard/focus path where practical, and no relevant console errors

QA evidence may use synthetic fixture aliases, statuses, resource/capability keys, note type keys, and value-safe counts only. It must not include note contents or real person/care labels.

Required fixture matrix:

- `owner_authorized`: `care_note.append` allowed, `care_note.view` allowed, append/read-back/reload succeeds
- `primary_authorized`: expected access follows accepted role defaults or explicit grant fixture
- `append_denied`: missing or denied `care_note.append`, append denied
- `view_denied`: broad `care_event.view` may exist, `care_note.view` denied or absent, note text does not hydrate
- `explicit_deny`: explicit deny overrides role/default/explicit allow
- `expired_grant`: expired grant ignored
- `revoked_grant`: revoked grant ignored
- `unrelated_user`: append/read denied without resource existence leakage
- `revoked_membership`: append/read denied
- `archived_team`: append/read denied
- `archived_recipient`: append/read denied
- `stale_permission_version`: fail closed
- `multiple_active_memberships`: fail closed if fixtureable under the active-boundary model
- `malformed_note`: stable rejection
- `oversized_note`: stable rejection
- `duplicate_same_command`: idempotent result without duplicate row
- `duplicate_mismatch`: rejected without note echo

QA may visually confirm note text appears in the authorized in-app timeline, but screenshots, logs, reports, and evidence snippets must avoid or redact note content.

Evidence packet fields:

- environment alias
- Sprint 5 accepted status
- Durable Care Notes contract accepted status
- Backend/WebApp/Security readiness status
- synthetic fixture aliases only
- viewport/platform
- build/lint/focused test status
- authorized append status
- authorized read-back status
- reload preservation status
- Today/Recent Updates note-family presence status
- negative denial status summaries
- event type key only
- capability keys only
- note type key only
- count delta only
- audit action-key summary if audit is introduced
- audit metadata allowlist pass/fail if audit is introduced
- direct write/update/delete denial status
- Provider Prep/share/export exclusion status
- console/leakage scan summary
- accessibility/mobile smoke summary
- tester/date

Evidence must not include:

- note text
- note snippets or note-derived summaries
- raw payload JSON
- screenshots showing note content unless explicitly redacted and approved before QA
- durable IDs, backend IDs, client event IDs, or UUIDs
- raw RPC/SQL errors
- emails, labels, user details, provider details, grant reasons, tokens, URLs, or unauthorized resource details

## No-Go Boundaries

This contract does not permit:

- documents or Vault persistence
- messages or realtime chat
- invitations or Care Team management
- provider externalization or provider accounts
- share links, exports, downloads, PDFs, email, public links, or Native share sheet
- Native app implementation
- profile labels or onboarding/profile persistence
- Calendar/task persistence
- note edit/delete/redaction/correction workflows beyond a future append-only correction contract
- AI interpretation, diagnosis, treatment guidance, risk scoring, clinical decision support, EHR replacement, telemedicine, billing, or emergency response

## Gates

Before implementation:

- Architecture accepts capability vocabulary and data flow
- Backend accepts RPC/migration and adapter plan
- Security/Privacy accepts note text handling, audit/logging allowlist, retention/deletion stance, and leakage controls
- UX accepts Today-only note copy and visibility states
- QA accepts fixture matrix and evidence rules
- Product Planning explicitly clears Sprint 6 execution after Sprint 5 acceptance
