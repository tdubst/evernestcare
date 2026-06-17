# Sprint 7 Care Circle, Invitations, And Permissions UX Contract

Status: Accepted implementation target after Sprint 7 addendum

## Purpose

Sprint 7 makes family collaboration usable while preserving fail-closed permissions. The first proof is Care Circle visibility, least-privilege invitations, and permissions UX derived from advisory projections. RLS/RPC remains the enforcement authority.

## Implementation Target

- Add Care Circle visibility that shows who is involved without exposing raw grants, grant reasons, backend identifiers, invitation tokens, or sensitive relationship internals.
- Add invitation create, pending, accepted, expired, revoked, and denied states with role/audience preview and expiration.
- Add permissions UX that explains visible capability categories from advisory projections only; UI does not own durable permission rules.
- Add value-safe audit action coverage for invite create, accept, revoke, expire, denied, and role update where the backend introduces those actions.

## Required Contracts And Boundaries

- Backend must derive inviter, invitee, team, recipient, role, expiration, revocation, and membership state server-side.
- Invite acceptance must fail closed for expired, revoked, stale, archived, unrelated, malformed, already-used, and wrong-audience cases.
- Invitation tokens and raw invite IDs must not appear in logs, status cards, analytics, crash output, AI prompts, URLs beyond the accepted invite flow, or QA evidence.
- Emails may be used only as intended delivery/addressing input; QA evidence must use aliases only.
- No documents, Vault, provider externalization, public links, real share/export, Native, or provider access in Sprint 7.

## Sprint 7 Implementation Addendum

This addendum is the implementation target. Product surfaces must use server-derived RPC/projection results, not direct invitation, member, user, role, or grant table rows.

### Required RPC / Projection Contracts

Backend may choose final function names, but the first proof must expose these typed server contracts or exact equivalents:

- `get_care_circle_summary(request jsonb default '{}'::jsonb)` returns safe roster and invitation summaries for the active boundary.
- `preview_care_circle_invitation(request jsonb)` returns role/audience/expiry/capability category preview only; it creates no invite.
- `create_care_circle_invitation(request jsonb)` creates a least-privilege invitation when the caller has `invitation.manage`.
- `list_care_circle_invitations(request jsonb default '{}'::jsonb)` returns pending/accepted/expired/revoked/denied summaries only.
- `accept_care_circle_invitation(request jsonb)` accepts only for the intended authenticated invitee/audience and creates or activates membership server-side.
- `revoke_care_circle_invitation(request jsonb)` revokes only for callers with `invitation.manage`.
- `expire_care_circle_invitations(request jsonb default '{}'::jsonb)` or an equivalent server-side expiry path marks elapsed invitations expired without client-owned time logic.
- `get_permissions_advisory_summary(request jsonb default '{}'::jsonb)` returns category-level capability keys for UI explanation only.

Accepted top-level statuses: `ready`, `created`, `accepted`, `pending`, `expired`, `revoked`, `denied`, `invalid_request`, `auth_required`, `boundary_unavailable`, `stale_permission_context`, `already_used`, `wrong_audience`, `duplicate_request`, `access_changed`, `unavailable`.

Non-ready or denied responses must return null boundary fields where applicable and empty summary arrays. They must not echo unauthorized invite, team, recipient, user, role, grant, or token details.

### Safe Result Shape

Roster/member summaries may include only:

- `subject_alias` or approved safe display label
- `role_category` or approved broad role label
- `membership_status`
- `invite_status`
- `capability_categories`
- `expiry_status` or value-safe `expires_in`
- value-safe activity wording such as `recently_active` or `no_recent_updates`

Invitation summaries may include only:

- `invite_preview_id` if needed as a non-authorizing, internal UI correlation marker
- `invite_status`
- `role_category`
- `audience_category`
- `capability_categories`
- `expiry_status` or value-safe `expires_in`
- `result`

Permissions summaries may include only:

- `role_category`
- `capability_category`
- `capability_key`
- `access_state`
- `source_scope`
- `result`

Forbidden in all client-visible results, logs, status/proof surfaces, analytics, crash reports, AI prompts, and QA evidence: invitation token values, `token_hash`, raw invitation IDs, raw user/member/team/recipient/role/grant IDs, emails, message text, raw grant rows, grant reasons, raw role UUIDs, relationship labels, profile labels, care labels, provider details, raw SQL/RPC errors, unauthorized resource details, public/share links, export/share metadata, and PHI-like details.

### Token And Addressing Rules

Invitation tokens are internal authorization material. If the existing schema stores `token_hash`, only the hash may persist. Plain token values may exist only transiently in the accepted invite delivery path and must not be returned in QA evidence, rendered in status/proof UI, logged, audited, or analytics-captured. Sprint 7 does not introduce public links. User-facing copy should use invite and expiration language, not public/private link framing.

Emails are addressing input only. The backend may normalize and match email addresses to authenticated users as needed, but client-visible proof and audit metadata must use aliases/statuses only.

### Audit Metadata Allowlist

Sprint 7 must patch or replace any invitation/member/role audit path that writes sensitive metadata. Existing invitation audit email metadata is not acceptable for invite create proof.

Allowed audit action keys, if audit is written in this slice:

- `care_circle_summary_requested`
- `care_circle_invitation_previewed`
- `care_circle_invitation_created`
- `care_circle_invitation_accepted`
- `care_circle_invitation_revoked`
- `care_circle_invitation_expired`
- `care_circle_invitation_denied`
- `care_circle_role_update_requested`
- `care_circle_role_update_accepted`
- `care_circle_role_update_denied`
- `permissions_advisory_summary_requested`

Allowed audit metadata only: `action`, `status`, `previous_status`, `role_key`, `role_category`, `capability_key`, `capability_category`, `audience_category`, `expiry_status`, `result`, `permission_revision`, and non-sensitive count/category summaries.

Forbidden audit metadata: email, token, token hash, raw invite ID, raw member/user/team/recipient IDs, raw role UUIDs, raw grant rows, grant reasons, relationship labels, profile labels, care labels, provider details, message text, payload JSON, raw SQL/RPC errors, unauthorized details, URLs, share/export/provider-delivery metadata, and PHI-like details.

### Direct Table Access Stance

WebApp must not use direct `invitations`, `care_team_members`, `users`, `roles`, or `permission_grants` table reads/writes for Sprint 7 product surfaces. RLS may still protect tables, but the accepted proof path is approved RPC/projection only. QA should prove direct mutation is denied where applicable, or record that the WebApp has no direct mutation path and Backend proof covers table enforcement.

## UX Requirements

- Copy should stay operational and calm: `Pending`, `Accepted`, `Expired`, `Revoked`, `Access changed`, `Family visible`, `Private`, `Can help coordinate`.
- Role/audience preview must explain category-level visibility, not raw grant internals.
- Denied and expired states must be generic and not reveal whether a care recipient, team, user, invite, or grant exists.
- Mobile `390x844` proof must show readable invite state, reachable controls, no horizontal overflow, and non-color-only statuses.
- Accepted entry labels: `Care Circle`, `Invite family`, `Invite caregiver`, `Review access`, `Send invite`, `Cancel`, `Close`.
- Accepted preview labels: `Family updates`, `Care coordination`, `Can help coordinate`, `Can view updates`, `Can add care updates`, `Expires in 7 days`, `No documents or provider access`.
- Current prototype copy that must be removed or gated before Sprint 7 acceptance: `Full access`, `Add provider`, `Provider`, `Private link`, `Included in visit summary`, and `Visit-scoped summary access`.
- Provider rows are out of scope unless rendered only as non-access contact context under a separate accepted contract. Sprint 7 must not imply provider access, provider delivery, share/export, public/private links, visit-summary sharing, or document access.
- Destructive/revocation actions must be visually separated and confirmed.
- Invite sheets/modals must have a visible title/label, explicit close/cancel path, back/Escape behavior, logical focus order, and focus trap if modal. Keyboard must not hide addressing input or the primary action.

## QA Acceptance

- Family invitation golden flow passes: create invite -> preview role/audience -> accept -> Care Circle reflects safe involvement.
- Permissions management golden flow passes: advisory visibility matches backend/RLS outcomes without becoming authority.
- Negative cases pass: expired, revoked, stale permission version, archived team/recipient, unrelated user, malformed invite, duplicate accept, and explicit deny where applicable.
- Additional required negative cases: wrong audience, already used, missing `invitation.manage`, direct mutation denied/non-use, invite token malformed, and role/audience mismatch.
- Audit proof passes: no email/token/raw ID/raw role/grant metadata is written by Sprint 7 invite/member/role paths.
- WebApp proof passes: Care Team route uses server-derived safe summaries, removes or gates provider/link/full-access prototype language, and shows no provider/share/export/document/Native behavior.
- Evidence uses aliases, statuses, role/capability keys, and value-safe counts only.
- No emails, tokens, durable IDs, raw grant rows, grant reasons, backend identifiers, raw SQL/RPC errors, profile labels, relationship labels, or PHI-like details in QA evidence.
- Build/lint/focused checks and mobile `390x844` console-clean proof are recorded.

## Continuation Gate

Sprint 8 may start only after Sprint 7 records acceptance evidence and has no P0 Security/Privacy, permissions, build, or golden-flow blocker.
