# Sprint 3 Closeout and Sprint 4 Readiness Backlog

This backlog records Sprint 3 hardening closeout after Sprint 2 completion and tracks Sprint 4 through Sprint 10 sequencing. It is not authorization to begin broad collaboration, sharing, provider access, or Native expansion before the relevant sprint gate passes.

## Current Gate

Sprint 3 is accepted as of June 4, 2026. The first Sprint 4 Today-only caregiver confidence slice is also accepted as of June 4, 2026. Sprint 5 resource access/provider-prep and Sprint 6 Durable Care Notes are accepted as of June 4, 2026.

```text
ensure care boundary -> append medication/vitals event through RPC -> hydrate advisory permissions -> read it back through RLS -> unrelated user denied -> mobile Today confidence remains console-clean
```

Accepted Sprint 3 evidence:

- `ensure_care_boundary`: transactional authenticated boundary bootstrap passed remote runtime verification, repeat/idempotency, concurrency/retry, anon denial, practical non-ready path, and mobile Today regression.
- `append_care_event`: server-side event append passed remote migration/runtime verification, authenticated insert, duplicate replay, duplicate mismatch conflict, validation failure, direct table write denial, unrelated-user denial, Today read-back, and privacy leakage checks.
- `hydrate_permission_context`: server-derived advisory capability hydration passed remote readiness, owner ready context, unrelated-user isolation, negative fixtures for revoked/left/multiple membership and grant deny/expired/revoked behavior, and mobile Today regression.
- Today medication/vitals confidence: signed-in mobile QA passed medication/vitals persistence, Recent Updates, in-app Visit Prep inclusion, reload preservation, care-note local-only guard, unrelated-user denial, and zero relevant console errors.
- The final Sprint 3 blocker, repeated-vitals duplicate React keys for `Now` labels, passed focused signed-in mobile rerun with repeated visible `Now` SVG labels and zero duplicate-key warnings.

## Sprint 4 Entry Decision

Product Planning go decision:

- Sprint 4 first execution slice is accepted.
- Entry path: narrow caregiver confidence, Today-first.
- Use existing Sprint 3 contracts where possible: `ensure_care_boundary`, `hydrate_permission_context`, `append_care_event`, and RLS read-back.
- First execution slice should stay inside active care profile/access confidence, medication/vitals continuity, Recent Updates, and in-app Visit Prep/provider-prep preview.
- Active care profile/access confidence should use generic active-workspace readiness from the hardened boundary. Do not present persisted recipient labels, relationships, age, care-team roster, or profile truth until Product Planning approves a backend profile contract.
- Care notes remain local-only unless separately cleared.

Broad caregiver feature expansion remains queued until Product Planning explicitly clears it.

Accepted Sprint 4 first-slice evidence:

- WebApp implemented a generic Today `WorkspaceAccessCard` derived from permission status and internal boundary readiness only.
- Security/Privacy cleared the card for QA; it renders generic copy and no IDs, labels, roles, grant details, backend metadata, raw errors, tokens, payloads, or PHI-like details.
- QA signed-in mobile proof passed at `390x844`: active boundary ready, permission hydration ready, workspace ready copy displayed, vitals append/read-back reached `Read back`, repeated vitals stayed console-clean, Recent Updates and in-app Visit Prep reflected the workflow, reload preserved hydration, care notes remained local-only, unrelated user was denied, and leakage scan passed.
- Residual accessibility debt remains in existing Today prototype controls with small hit areas; it was not introduced by `WorkspaceAccessCard` and should be tracked as beta polish.

## Sprint 5 and Sprint 6 Sequencing

Sprint 5 is the permissions/sharing/provider-prep gate sprint:

- first backend candidate: a narrow server-derived resource-scoped access projection, working name `hydrate_resource_access_context`
- default product posture: design-and-gate sprint, not broad implementation
- governing decision record: `DECISIONS/008-resource-scoped-permissions-and-provider-prep-gates.md` accepted after Architecture, Backend, Security/Privacy, UX, and QA review
- accepted implementation contract: `docs/architecture/sprint-5-resource-access-provider-prep-contract.md`
- only optional UX implementation candidate: in-app read-only Provider Prep Review / share-intent preview with no external delivery
- define resource-scoped permission projections before displaying document/message/conversation/imaging/provider-summary access as user-facing truth
- review provider-prep externalization, share/export, download/send, provider access, expiration/revocation, and audit evidence
- decide whether persisted care profile/onboarding labels belong before sharing/provider-prep expansion
- require Architecture, Security/Privacy, Backend, UX, and QA gates before implementation

Sprint 6 is the earliest candidate for broader expansion after Sprint 5 gates pass:

- documents/Vault, messages, invitations, care-team management, provider summary externalization, export/share, Native, and durable care notes remain Sprint 6-or-later candidates
- Sprint 6 work must start from accepted Sprint 5 contracts, not from prototype UI affordances
- do not start Sprint 6 implementation directly from Sprint 4 without Product Planning go/no-go
- pick one lane at a time; do not bundle documents, messages, invitations, provider externalization, Native, and durable notes into one sprint
- current Architecture recommendation: choose Durable care notes as the first Sprint 6 lane after Sprint 5 passes, because notes already exist as local-only domain/UI behavior and align with append-only `care_events`; this is a recommendation only, not authorization to persist notes before a Sprint 6 care-note contract passes

## Sprint 7-10 Beta Continuation

Accepted governing record:

- `DECISIONS/009-sprint-7-10-beta-continuation.md`

Accepted implementation and acceptance contract:

- `docs/architecture/sprint-7-10-beta-continuation.md`

Sprint 6 Durable Care Notes is accepted in `docs/architecture/sprint-6-durable-care-notes-closeout.md`. Product Planning may continue automatically through Sprint 7-10 only when the prior sprint records acceptance evidence and no P0 Security/Privacy, permissions, build, or golden-flow blocker remains.

Default order:

1. Sprint 7: Care Circle, Invitations, and Permissions UX
2. Sprint 8: Vault / Documents Beta Slice
3. Sprint 9: Native iOS / Mobile Beta Baseline
4. Sprint 10: Beta Hardening and Release Readiness

Automatic continuation does not skip gates. Each sprint must inspect relevant files, summarize intended changes, implement narrowly, verify focused paths, and record acceptance evidence. If any P0 gate fails, stop continuation and switch to remediation planning.

## Readiness Backlog

| Priority | Item | Owner | Type | Status | Acceptance |
| --- | --- | --- | --- | --- | --- |
| P0 | Authenticated WebApp proof path | WebApp + QA | Verification | Passed | Synthetic signed-in user can log medication or vital on mobile Today, see `Persistence check` reach `Read back`, and pass fresh-load console checks. |
| P0 | Persistence status privacy review | Security/Privacy | Review | Passed | Status surface shows only safe labels/status metadata; no payload, care details, tokens, secrets, or PHI-like details. |
| P0 | `ensure_care_boundary` implementation | Backend + Architecture + Security/Privacy + QA | Hardening | Passed | Transactional boundary bootstrap replaces client multi-step creation, returns non-sensitive boundary metadata, passes build/lint, migration review, RLS/security review, and synthetic verification. |
| P0 | `append_care_event` implementation | Backend + Architecture + Security/Privacy + QA | Hardening | Passed | Server-side append preserves idempotency by client event ID, derives actor attribution server-side, validates event type/source/schema structurally, locks direct client writes, and returns non-sensitive result metadata. |
| P0 | Real permission/grant hydration | Backend + Security/Privacy + Architecture + QA | Hardening | Passed | UI grants are derived from real role/capability state and remain advisory; RLS/RPC remains enforcement authority; negative permission fixtures pass. |
| P0 | Today medication/vitals confidence loop | WebApp + Security/Privacy + QA | Product proof | Passed | Persisted medication/vitals history hydrates, append/read-back works, Recent Updates and in-app Visit Prep reflect the event, reload preserves state, care notes remain local-only, unrelated user is denied, and console is clean. |
| P0 | Sprint 4 architecture/security/UX/WebApp readiness | Architecture + Security/Privacy + UX + WebApp + Product Planning | Planning | Passed | Product Planning has a minimal accepted Sprint 4 scope and a clear implementation order with no unresolved privacy or architecture blocker. |
| P0 | Sprint 4 Today workspace/access confidence | WebApp + Security/Privacy + QA | Product proof | Passed | Signed-in mobile Today shows generic active-workspace confidence, medication/vitals append/read-back and reload continuity pass, Recent Updates and in-app Visit Prep reflect the workflow, care notes remain local-only, unrelated user is denied, console is clean, and leakage scan passes. |
| P0 | Sprint 4 QA proof plan | QA + Product Planning | Verification planning | Passed | QA completed the mobile signed-in proof for the first Sprint 4 execution slice. |
| P1 | Mobile QA fallback plan | QA + WebApp | Verification | Active | If Codex Browser automation is unstable, QA has a repeatable manual or alternate automation path for 390x844 smoke, console checks, and screenshot capture. |
| P1 | Sprint 5 permissions/sharing/provider-prep gate | Architecture + Security/Privacy + Backend + UX + QA | Review | Passed | `DECISIONS/008-resource-scoped-permissions-and-provider-prep-gates.md` accepted as governing gate record. No provider summary, share, export, invitation, role-change, resource-scoped permission display, document/message, or Native implementation proceeds without privacy, permission, architecture, and QA gates. |
| P1 | Sprint 5 resource-scoped access projection | Backend + Architecture + Security/Privacy + QA | Contract candidate | Accepted | `docs/architecture/sprint-5-resource-access-provider-prep-contract.md` defines the accepted target. A server-derived projection returns only safe access summaries for active-boundary resource classes; no raw grant rows, emails, user rows, labels, titles, message metadata, provider details, or payloads. |
| P1 | Sprint 5 Provider Prep Review | WebApp + UX + Security/Privacy + QA | Optional narrow proof | Accepted | `docs/architecture/sprint-5-resource-access-provider-prep-contract.md` defines the accepted preview-only target. In-app read-only review of medication/vitals-derived Visit Prep contents only; no send/share/download/provider access, documents/messages/durable notes, public URLs, or tokens. |
| P1 | Sprint 6 Durable Care Notes | Product Planning + Backend + Security/Privacy + WebApp + UX + QA | Expansion lane | Accepted | `docs/architecture/sprint-6-durable-care-notes-closeout.md` records accepted scope and QA evidence. Durable notes append/read-back/reload in Today passes; `view_denied` and `append_denied` mobile denial proofs pass; notes remain excluded from Provider Prep/share/export/provider access. |
| P1 | Sprint 7-10 beta continuation policy | Product Planning + Architecture + Security/Privacy + UX + QA | Planning | Accepted | `DECISIONS/009-sprint-7-10-beta-continuation.md` and `docs/architecture/sprint-7-10-beta-continuation.md` define the automatic post-Sprint-6 sequence, required gates, and beta-readiness acceptance model. |
| P1 | Sprint 7 Care Circle / Invitations / Permissions UX | Product Planning + Backend + Security/Privacy + WebApp + UX + QA | Expansion lane | Authorized | `docs/architecture/sprint-7-care-circle-invitations-permissions-contract.md` is the accepted planning target. Family invitation and permissions golden flows must pass with safe statuses, expiration/revoke behavior, and no emails, tokens, IDs, raw grants, or sensitive labels in evidence. |
| P1 | Sprint 8 Vault / Documents beta slice | Product Planning + Backend + Security/Privacy + WebApp + UX + QA | Expansion lane | Queued | Start only after Sprint 7 acceptance. `docs/architecture/sprint-8-vault-documents-beta-contract.md` defines the planning target. Document upload golden flow must pass with storage RLS, per-artifact access, denied/revoked/expired/stale cases, safe audit metadata, and mobile proof. |
| P1 | Sprint 9 Native iOS / Mobile beta baseline | Product Planning + Mobile + Security/Privacy + Architecture + QA | Expansion lane | Queued | Start only after Sprint 8 acceptance. `docs/architecture/sprint-9-native-ios-beta-baseline-contract.md` defines the planning target. Expo app must have repeatable typecheck/build path, auth/session stance, sign-out cleanup, read-only continuity or safe deferred states, and TestFlight checklist. |
| P1 | Sprint 10 beta hardening and release readiness | Product Planning + Architecture + Security/Privacy + UX + Backend + WebApp + Native + QA | Release readiness | Queued | Start only after Sprint 9 acceptance. `docs/architecture/sprint-10-beta-hardening-release-readiness-contract.md` defines the planning target. Golden-flow regression, accessibility/mobile checks, privacy-safe monitoring policy, release notes, known limitations, rollback plan, and go/no-go evidence must be recorded. |

## Sprint 4 Caregiver Workflow Candidate Scope

Caregiver workflow work should stay narrow:

- active care profile/access confidence using the current hydrated boundary if approved by Security/Privacy
- generic active-workspace copy only; no persisted recipient label/profile claims without a reviewed backend profile contract
- medication add/taken continuity
- vitals add/history continuity
- Recent Updates confidence
- in-app Visit Prep/provider-prep preview as factual context only

Do not include:

- diagnosis
- treatment guidance
- clinical decision support
- EHR replacement
- telemedicine
- billing
- emergency response
- provider summary sharing/export as a real external-sharing surface without review
- documents/messages/invitations
- permissions-facing UI or resource-scoped access displays
- Native implementation
- real profile/onboarding persistence unless separately contracted

## Sprint 5 Backend Candidate Contract

If Product Planning chooses a narrow Sprint 5 implementation instead of design-only gates, start with a resource-scoped access projection RPC, not sharing/export or invitation flows.

Decision record: `DECISIONS/008-resource-scoped-permissions-and-provider-prep-gates.md`.

Working name:

```text
hydrate_resource_access_context
```

Candidate result shape:

- stable status
- app user ID, active care team ID, active care recipient ID, membership ID/status, role key, permission version
- allowlisted resource access summaries such as `{resource_type, resource_id|null, capability, access, source_scope, expires_at|null}` only when safe

Do not return:

- raw grant rows or reasons
- emails, full user rows, profile labels, recipient labels, relationship labels, document titles, message metadata, provider details, event payloads, note text, raw SQL/RPC errors, tokens, secrets, or unauthorized resource IDs

QA fixture needs:

- owner, primary caregiver, family member, viewer/provider/emergency aliases as applicable
- explicit allow and deny
- deny overriding allow
- expired and revoked grants
- restricted placeholder resources
- removed conversation participant
- unrelated user denial
- archived team/recipient
- audit-read denial

This projection is a prerequisite for permissions-facing UI, provider-prep inclusion decisions, document/message visibility hints, and later sharing/export. It remains advisory; RLS/RPC remains the enforcement authority.

## Sprint 5 Optional UX Candidate

If Sprint 5 includes one user-facing proof, choose an in-app read-only Provider Prep Review / share-intent preview.

Allowed:

- authenticated active-boundary path only
- deterministic factual preview from already accepted medication/vitals continuity
- timeframe and content-category labels
- source label such as `Source: Recent Updates`
- copy such as `Review for Visit Prep`, `Not shared yet`, `For coordination only`
- explicit statement that no external sharing/export/provider access has occurred

Not allowed:

- `Share now`, `Send`, `Download`, public links, external provider access, provider portal behavior, PDF/email/native share, or token generation
- documents/messages/durable care notes/profile labels unless separately cleared
- raw event payloads, durable IDs, client event IDs, share tokens, invitation tokens, provider details, document titles, note text, or medication/vitals values in proof/status/debug surfaces
- clinical copy such as `normal`, `stable`, `target range`, `provider approved`, diagnosis, treatment guidance, risk scoring, or hidden AI interpretation

QA must prove this surface is preview-only and that no external action, durable share record, public URL, token, or provider access is created.

## Sprint 6 Candidate Lanes

Select one lane at a time after Sprint 5 gates pass:

- Documents/Vault: storage contract, artifact lineage, per-document RLS/grants, audit metadata, upload error states.
- Messages: conversation membership, message RLS, revocation behavior, retention policy, notification privacy.
- Invitations/Circle: least-privilege invite, preview what the invitee can see, expiration/revoke states, audit.
- Provider externalization: deterministic packet preview, selected contents, audience/expiration, share/export, audit/revoke.
- Durable care notes: note event schema, note sensitivity policy, RLS, edit/delete or append-only correction semantics, summary inclusion rules.
- Native: read-only continuity first; camera/scanner/share/Health/device flows only after shared auth, permission, storage, offline, and privacy contracts are stable.

Current recommended first lane: Durable care notes, after Sprint 5 acceptance.

Required pre-implementation contract:

- care-note capability vocabulary such as `care_note.append` and `care_note.view`, or an explicit reviewed mapping under `care_event`
- `append_care_event` validation for `CareNoteAddedEvent`
- note payload limits and safe allowed note types
- read-back and hydration behavior for notes
- audit action keys and metadata allowlist excluding note text
- retention/deletion or append-only correction stance
- provider-prep inclusion policy, defaulting to excluded until separate review
- QA evidence rules that never expose note contents

First proof:

```text
authenticated active boundary -> advisory access allows note append/view -> append CareNoteAddedEvent through server RPC -> read back through RLS -> reload shows note in Today/Recent Updates -> unrelated/revoked/expired/archived users denied -> audit metadata records action/status only, no note text
```

## Completed Sprint 3 Design Outputs

### `ensure_care_boundary`

The design proposal should answer:

- What input does the client provide?
- What identifiers are created or reused?
- How is idempotency handled?
- How are partial failures prevented?
- What RLS/security-definer assumptions are required?
- What non-sensitive result shape returns to the client?
- What audit events are written without PHI in metadata?
- What rollback or retry behavior is safe?

### `append_care_event`

The design proposal should answer:

- What event fields remain client supplied?
- What actor/team/recipient fields are derived server-side?
- How are event type, source, schema version, and payload shape validated?
- How is duplicate `client_event_id` handled?
- What non-sensitive status/read-back metadata returns?
- How does unauthorized insert fail closed?
- What audit metadata is written?

### Real Permission Hydration

The design proposal should answer:

- Which role/capability tables or policies are source of truth?
- What advisory grants should the UI receive?
- How does the UI avoid showing actions it cannot complete?
- How does the app handle stale grants or revoked membership?
- What is the failure mode when permission hydration is unavailable?

## Sprint 4 QA Acceptance Checklist

Before Product Planning accepts Sprint 4:

- `npm run build` passes.
- Focused lint or full lint status is recorded.
- Synthetic signed-in mobile Today proof remains passing at 390x844.
- Active boundary and permission hydration are ready.
- Medication or vital action reaches `Persistence check -> Read back`.
- Recent Updates and in-app Visit Prep show factual continuity context.
- Reload preserves the hydrated medication/vitals projection.
- Console check shows no new app errors or warnings from the proof path.
- Status/confidence UI exposes no payload, secrets, tokens, keys, raw backend errors, durable IDs, client event IDs, care-note text, or PHI-like proof details.
- Unrelated user read/write denial remains covered.
- Care notes remain local-only unless Product Planning explicitly clears persistence with Security/Privacy.
- Architecture confirms no new backend contract is required, or Backend provides the reviewed contract before implementation.
- Security/Privacy confirms no new privacy blocker.

## CTO Action Queue

1. Consolidate remaining Sprint 4 implementation/readiness callbacks.
2. Keep Sprint 4 care profile/access confidence generic and boundary-derived; defer real profile/onboarding persistence until a reviewed backend profile contract exists.
3. Execute the authorized narrow WebApp Sprint 4 slice.
4. Route any changed workspace/access confidence copy through Security/Privacy before QA runtime proof.
5. Run QA signed-in mobile proof for Sprint 4.
6. Prepare Sprint 5 permission/sharing/provider-prep scope only after Sprint 4 is accepted.
7. Execute Sprint 7 Care Circle / Invitations / Permissions UX against `docs/architecture/sprint-7-care-circle-invitations-permissions-contract.md`.
8. Continue through Sprint 8-10 only after each prior sprint records acceptance evidence and no P0 privacy, permissions, build, or golden-flow gate fails.
9. Keep Native iOS implementation gated until Sprint 9 and until shared domain, permission, and persistence contracts are stable enough to reuse.
