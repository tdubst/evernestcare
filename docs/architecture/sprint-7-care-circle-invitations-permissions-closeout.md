# Sprint 7 Care Circle / Invitations / Permissions UX Closeout

Status: Accepted

Acceptance date: June 4, 2026

Product Planning owner: EFC - Product Planning

## Implemented Scope

Completed:

- Care Circle route now uses server-derived RPC/projection surfaces instead of prototype roster constants.
- Safe Care Circle summaries render aliases, broad role/audience/status labels, category summaries, and value-safe counts only.
- Invitation preview, create, list, accept, deny, revoke, expire, and plural-expiry paths use approved Sprint 7 RPCs.
- Permissions UX renders advisory category-level summaries while RLS/RPC remains enforcement authority.
- Invitation and membership audit metadata is allowlisted to status/category/result fields.
- WebApp product path does not directly read or write `invitations`, `care_team_members`, `users`, `roles`, or `permission_grants`.

Deferred:

- Provider externalization or provider access.
- Public links, share/export/download, provider delivery, documents, messages, or Native behavior.
- Rich relationship/profile labels and detailed permission-source explanations.
- Direct table hard-locking beyond the accepted RPC/projection product proof boundary.

Explicitly out of scope:

- Diagnosis, treatment guidance, clinical decision support, EHR replacement, telemedicine, billing, emergency response, public links, real share/export, or external provider access.

## Affected Golden Flows

- Family invitation flow: preview, create, pending, accept, deny/revoke/expire states.
- Permissions management: advisory category rows reflect backend/RLS outcomes without becoming authority.
- Care Circle visibility: safe involvement rows and counts under the active care boundary.
- Caregiver onboarding and active workspace confidence: preserved.

## Privacy And Permissions Impact

- RLS/RPC remains enforcement authority.
- Product surfaces use approved RPC/projection results only.
- `invite_preview_id` is internal client correlation material only and is not rendered, logged, or captured in QA evidence.
- Emails are addressing input only and are excluded from evidence, status, logs, audit metadata, and screenshots.
- UI, logs, audit metadata, and QA evidence exclude tokens, token hashes, raw invite/member/user/team/recipient/role/grant IDs, raw grants, grant reasons, raw RPC/SQL errors, backend metadata, provider details, URLs, and PHI-like content.
- Denied/non-ready states fail closed with generic copy and no role/audience/capability detail echo.

## QA Evidence Summary

- Backend final synthetic metadata matrix: PASS.
- Backend negative invitation states: PASS with no category detail echo for wrong audience, already used, denied, revoked, expired, malformed, stale, unrelated, archived, and missing-management cases.
- Backend direct non-manager insert posture: denied with zero mutation.
- Backend audit allowlist scan: PASS; no disallowed metadata keys.
- WebApp focused lint/build/local smoke: PASS.
- Security/Privacy WebApp review: CLEAR.
- Caregiver UX review: CLEAR.
- Signed-in mobile WebApp proof at `390x844`: PASS with console caveat.
- Owner route load, safe Care Circle summary, advisory permissions, no-write preview, create/pending state: PASS.
- Intended invitee accept path: PASS.
- Wrong-audience fail-closed path: PASS.
- Missing `invitation.manage` path: PASS.
- Provider/share/export/public-link/documents/messages/Native/provider-access no-go scan: PASS.
- Forbidden prototype/provider/link/full-access/visit-summary copy scan: PASS.
- Mobile/accessibility smoke: PASS.

## Risks Or Blockers

P0 blockers: None.

Residual risks:

- The wrong-audience negative WebApp path produced browser resource-load console entries for expected denied RPC calls with status class `400`. No raw RPC/SQL body, IDs, tokens, or sensitive values were included in evidence. Track as beta hardening if Product Planning later requires strict zero browser network-error entries for expected denial paths.
- Build has a known large chunk warning; track as beta hardening, not Sprint 7 acceptance.
- QA evidence is content-free by design and does not include screenshots containing invite addresses, markers, credentials, or sensitive content.

Follow-up debt:

- Keep Provider Prep/share/export/public-link/provider access out of Care Circle and invitations until separately contracted.
- Keep beta regression coverage focused on invitation denial, audit metadata, and permissions projection boundaries.
- Consider normalizing denied RPC transport if strict console-clean negative paths become a beta gate.

## Continuation Decision

Next sprint: Sprint 8 Vault / Documents Beta Slice.

Authorized to continue automatically: Yes.

Reason: Sprint 7 acceptance evidence is recorded and no P0 Security/Privacy, permissions, build, golden-flow, audit, or WebApp runtime blocker remains.

Required remediation before continuation: None.
