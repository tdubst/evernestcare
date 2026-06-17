# Sprint 6 Durable Care Notes Closeout

Status: Accepted

Acceptance date: June 4, 2026

Product Planning owner: EFC - Product Planning

## Implemented Scope

Completed:

- Durable Care Notes first lane accepted as the first broader post-Sprint-5 expansion.
- `CareNoteAddedEvent` persists through the approved `append_care_event` path.
- `care_note.append` and `care_note.view` are the outward capability vocabulary.
- Note reads require `care_note.view`; broad `care_event.view` alone does not hydrate note text.
- Today renders durable notes only in authorized Recent Updates / timeline workflow surfaces.
- Provider Prep, share/export, provider summary, continuity, status/proof/access surfaces remain note-content-free.

Deferred:

- Provider Prep note inclusion.
- Real share/export/download/provider delivery.
- Note edit/delete/correction/redaction workflows.
- Documents/messages/invitations/Native expansion.
- AI processing or clinical interpretation of note text.

Explicitly out of scope:

- Diagnosis, treatment guidance, clinical decision support, EHR replacement, telemedicine, billing, emergency response, provider portal behavior, public links, or real external provider access.

## Affected Golden Flows

- Medication tracking: preserved.
- Appointment / Visit Prep: preserved with explicit care-note exclusion.
- Permissions management: extended through `care_note.append` and `care_note.view`.
- Recent Updates / Today continuity: durable care notes append, read back, and reload for authorized users.

## Privacy And Permissions Impact

- RLS/RPC remains enforcement authority.
- Advisory permission projection supports `care_note.append` and `care_note.view`.
- Note text is treated as high-sensitivity free text.
- Audit/status/proof/evidence surfaces exclude note text, snippets, payload JSON, raw errors, tokens, provider details, grant reasons, unauthorized details, and backend identifiers.
- Security/Privacy cleared the backend slice, WebApp slice, and `view_denied` repair for QA proof.

## QA Evidence Summary

- Backend synthetic runtime proof: PASS.
- WebApp focused lint/build: PASS.
- Authorized signed-in mobile Today proof at `390x844`: PASS.
- Save/read-back/reload once-only proof: PASS.
- `view_denied` denial rerun: PASS; visible note-family count `0 -> 0`, durable visible count `0 -> 0`, denied copy, leakage/console/mobile clean.
- `append_denied` denial rerun: PASS; visible note-family count `2 -> 2`, durable visible count `1 -> 1`, denied copy, leakage/console/mobile clean.
- Provider Prep/share/provider-summary/export-like/continuity/status/proof/access leakage scan: PASS.
- Console/mobile/accessibility smoke: PASS.

## Risks Or Blockers

P0 blockers: None.

Residual risks:

- Build has a known large chunk warning; track as beta hardening, not Sprint 6 acceptance.
- QA evidence is content-free by design and does not include screenshots showing note content.

Follow-up debt:

- Keep care-note inclusion out of Provider Prep/share/export until a separate explicit-selection/redaction contract is accepted.
- Keep beta regression coverage focused on permissions and note visibility boundaries.

## Continuation Decision

Next sprint: Sprint 7 Care Circle, Invitations, and Permissions UX.

Authorized to continue automatically: Yes.

Reason: Sprint 6 acceptance evidence is recorded and no P0 Security/Privacy, permissions, build, or golden-flow blocker remains.

Required remediation before continuation: None.
