# Evernest Entity Model

Inherits from:
- `FOUNDATION/PERMISSIONS_MODEL.md`
- `FOUNDATION/DATABASE_RULES.md`
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/development-workflow.md`

This is the canonical domain authority for pre-alpha implementation. Database schema, API contracts, UI state, and tests must derive from this model instead of route-level mock data.

## Cross-Cutting Rules

- Every persisted entity has an owner boundary.
- Every care-related entity is scoped to a `CareRecipient`, `CareTeam`, or both.
- User-visible records support soft deletion unless the record is an immutable audit event.
- Revocation must remove future access and prevent stale UI disclosure.
- Sensitive changes produce `AuditEvent` records.
- Archival is distinct from deletion; archived care recipients preserve historical context while blocking routine edits.

## User

- Purpose: authenticated app participant.
- Ownership: self-owned account profile mapped to Supabase Auth identity.
- Relationships: may belong to many care teams; may create care recipients; may receive invitations.
- Visibility rules: users see their own profile and limited profile data for care-team members they share a team with.
- Lifecycle: invited, active, suspended, deleted.
- Archival behavior: account archival disables login and removes active memberships.
- Revocation behavior: revoking a user's membership removes access to team-scoped resources.
- Permission inheritance: inherits through care-team membership and direct grants.
- Soft delete policy: soft delete profile data where legally and operationally possible; preserve audit references.
- Audit requirements: account creation, membership changes, suspension, and deletion.

## CareRecipient

- Purpose: person receiving coordinated care.
- Ownership: owned by a care team with one or more administrators.
- Relationships: has appointments, medications, tasks, documents, imaging studies, conversations, notifications, and audit events.
- Visibility rules: visible only to users with recipient-level permission through role or grant.
- Lifecycle: draft, active, archived, deleted.
- Archival behavior: archived recipients are read-mostly and excluded from routine task creation by default.
- Revocation behavior: removing recipient access blocks all child-resource access unless a narrower explicit grant remains.
- Permission inheritance: child resources inherit recipient/team access unless overridden by stricter grants.
- Soft delete policy: soft delete; hard delete only through reviewed data removal process.
- Audit requirements: creation, ownership transfer, archive, restore, deletion.

## CareTeam

- Purpose: collaboration boundary around one care recipient.
- Ownership: owned by one or more team administrators.
- Relationships: includes users, roles, invitations, permission grants, conversations, and audit events.
- Visibility rules: team membership is visible to members unless a privacy exception is explicitly designed.
- Lifecycle: active, archived, dissolved.
- Archival behavior: freezes invitations and new routine activity.
- Revocation behavior: removing membership revokes inherited access to team resources.
- Permission inheritance: roles grant default permissions within the team.
- Soft delete policy: soft delete after all legal/operational retention needs are handled.
- Audit requirements: membership, invitation, role, and ownership changes.

## Role

- Purpose: named permission bundle for a care-team member.
- Ownership: system-defined roles with optional team-level assignments.
- Relationships: assigned to users through memberships; maps to permission grants.
- Visibility rules: members can inspect their own role; administrators can inspect team roles.
- Lifecycle: active, deprecated.
- Archival behavior: deprecated roles remain for audit history but cannot be newly assigned.
- Revocation behavior: removing a role removes inherited permissions.
- Permission inheritance: roles are the primary inheritance source.
- Soft delete policy: do not hard delete role definitions used by audit history.
- Audit requirements: role assignment, removal, and role definition changes.

## PermissionGrant

- Purpose: explicit allow/deny capability on a resource or resource class.
- Ownership: owned by the care team or resource administrator that issued it.
- Relationships: links user or role to resource scope.
- Visibility rules: inspectable by administrators and by affected users in plain language.
- Lifecycle: active, expired, revoked.
- Archival behavior: archived grants remain as historical records.
- Revocation behavior: revocation must propagate to child resources unless separately granted.
- Permission inheritance: may override role defaults with narrower or broader scoped access.
- Soft delete policy: never hard delete active or historical grants; revoke instead.
- Audit requirements: create, update, expire, revoke.

## Invitation

- Purpose: pending, auditable offer of care-team access to a person by email or future verified identity.
- Ownership: owned by the issuing care team and inviting administrator.
- Relationships: links invited email, optional invited user, care team, role, permission grants, care recipient, and audit events.
- Visibility rules: visible to care-team administrators and the invited user after identity verification; raw tokens are never visible.
- Lifecycle: pending, accepted, expired, revoked, declined.
- Archival behavior: invitations remain in history after acceptance, expiration, revocation, or recipient/team archival.
- Revocation behavior: revoked invitations cannot be accepted and must not leave residual role or permission grants.
- Permission inheritance: accepted invitations create membership and role-derived permissions only after explicit acceptance.
- Soft delete policy: do not hard delete; mark revoked, expired, or declined while preserving audit history.
- Audit requirements: create, resend, accept, expire, revoke, role change before acceptance.

## Appointment

- Purpose: schedule and coordinate care-related events.
- Ownership: scoped to care recipient and care team.
- Relationships: participants, tasks, documents, reminders, messages.
- Visibility rules: visible to users with appointment or recipient schedule access.
- Lifecycle: planned, confirmed, completed, canceled, archived.
- Archival behavior: completed/canceled appointments stay in history.
- Revocation behavior: appointment access is removed when recipient or appointment grant is revoked.
- Permission inheritance: inherits recipient schedule access unless restricted.
- Soft delete policy: soft delete with cancellation metadata.
- Audit requirements: create, update, cancel, participant changes.

## Medication

- Purpose: user-entered medication tracking and coordination.
- Ownership: scoped to care recipient.
- Relationships: medication logs, tasks, reminders, documents.
- Visibility rules: visible to users with medication access.
- Lifecycle: active, paused, discontinued, archived.
- Archival behavior: discontinued medications remain in history.
- Revocation behavior: medication access revocation hides medication and logs.
- Permission inheritance: inherits recipient medication permission.
- Soft delete policy: soft delete; preserve logs for audit/history.
- Audit requirements: create, dose/schedule changes, pause, discontinue, delete.

## Task

- Purpose: coordinate family care actions.
- Ownership: scoped to care recipient and optionally assigned to a user.
- Relationships: appointments, medications, documents, messages, notifications.
- Visibility rules: visible to users with task access and assignees.
- Lifecycle: open, in_progress, blocked, completed, canceled, archived.
- Archival behavior: completed/canceled tasks remain searchable in history.
- Revocation behavior: revocation removes visibility unless user is assigned through a still-valid grant.
- Permission inheritance: inherits recipient task access.
- Soft delete policy: soft delete.
- Audit requirements: assignment, completion, cancellation, sensitive task edits.

## Conversation

- Purpose: permission-scoped communication thread.
- Ownership: scoped to care team, care recipient, or specific resource.
- Relationships: messages, participants, documents, tasks.
- Visibility rules: visible only to participants with active access.
- Lifecycle: active, muted, archived, closed.
- Archival behavior: archived conversations are read-only unless reopened.
- Revocation behavior: revoked users lose future access; historical access policy must be explicit per beta privacy decision.
- Permission inheritance: may inherit care-team access or use explicit participant grants.
- Soft delete policy: soft delete thread metadata; messages follow message policy.
- Audit requirements: participant changes, archive, close, sensitive sharing.

## Message

- Purpose: communication item inside a conversation.
- Ownership: authored by a user and scoped to conversation permissions.
- Relationships: attachments, documents, tasks, audit events.
- Visibility rules: visible to current conversation participants unless retention policy says otherwise.
- Lifecycle: sent, edited, deleted, archived.
- Archival behavior: follows parent conversation.
- Revocation behavior: future visibility follows conversation revocation; historical visibility requires policy decision.
- Permission inheritance: inherits conversation access.
- Soft delete policy: soft delete for user delete; preserve moderation/audit metadata when needed.
- Audit requirements: deletion, participant-visible sensitive attachment sharing.

## Document

- Purpose: store user-uploaded files and metadata.
- Ownership: scoped to care recipient and uploader; access controlled by grants.
- Relationships: appointments, imaging studies, messages, tasks.
- Visibility rules: document-level grants can be stricter than recipient access.
- Lifecycle: uploaded, processing, active, archived, deleted.
- Archival behavior: archived documents remain available to authorized users.
- Revocation behavior: revoking a document grant removes file and metadata access.
- Permission inheritance: may inherit recipient document access unless marked restricted.
- Soft delete policy: soft delete metadata; storage object lifecycle requires reviewed deletion process.
- Audit requirements: upload, view/share grant, revoke, delete.

## ImagingStudy

- Purpose: represent imaging-related uploads and provider-written summaries without interpretation.
- Ownership: scoped to care recipient and source document.
- Relationships: documents, appointments, messages, tasks.
- Visibility rules: follows document-level and imaging-specific permissions.
- Lifecycle: uploaded, active, archived, deleted.
- Archival behavior: archived with source document.
- Revocation behavior: revoking imaging access removes access to linked files and summaries.
- Permission inheritance: inherits document permission by default.
- Soft delete policy: soft delete metadata; storage follows document policy.
- Audit requirements: upload, link to appointment, share, revoke, delete.

## Notification

- Purpose: alert users to care coordination events.
- Ownership: recipient user owns delivery state; source entity owns event context.
- Relationships: tasks, appointments, messages, invitations, medications.
- Visibility rules: notification content must not leak inaccessible resource details.
- Lifecycle: pending, delivered, read, dismissed, expired.
- Archival behavior: expired/dismissed notifications may be pruned after retention period.
- Revocation behavior: revoked access cancels future notifications and redacts inaccessible content.
- Permission inheritance: notification eligibility derives from source resource access.
- Soft delete policy: delivery records may be soft deleted or expired.
- Audit requirements: required for security-sensitive notifications, not routine reminders.

## AuditEvent

- Purpose: immutable record of sensitive access, permission, role, document, invitation, and ownership changes.
- Ownership: system-owned, scoped to care team and affected resource.
- Relationships: actor user, target user, resource, care recipient, care team.
- Visibility rules: visible to authorized administrators; user-facing audit summaries may be narrower.
- Lifecycle: created only; no updates except system retention markers.
- Archival behavior: retained with care team/recipient history.
- Revocation behavior: revoking access does not delete audit events.
- Permission inheritance: audit visibility is explicit and administrator-scoped.
- Soft delete policy: no soft delete for normal operation.
- Audit requirements: audit events are the requirement.
