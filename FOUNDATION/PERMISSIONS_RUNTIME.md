# Evernest Permissions Runtime

Inherits from:
- `FOUNDATION/PERMISSIONS_MODEL.md`
- `FOUNDATION/ENTITY_MODEL.md`
- `DECISIONS/003-permissions-philosophy.md`

This document defines runtime behavior before database implementation.

## Runtime Principles

- Deny by default.
- Least privilege by default.
- Role access is inherited only inside a care team.
- Explicit grants can narrow or extend access, but must be inspectable and auditable.
- Revocation must take effect immediately for future reads and writes.
- UI visibility must match server/database authorization, but UI is never the source of truth.

## Role Inheritance

Roles provide default permission bundles:

- `owner`: full administrative control over a care team and care recipient.
- `primary_caregiver`: broad care coordination access, excluding ownership transfer unless granted.
- `family_member`: shared view/comment/task participation.
- `viewer`: read-limited access to selected surfaces.
- `provider_contact`: no default account access unless invited.
- `emergency_contact`: contact designation only unless separately granted.

Explicit grants override role defaults for a resource scope.

## Family Visibility

Family members should see enough context to coordinate safely, but not every detail by default. Sensitive resources, especially documents and imaging, may require narrower grants than general care-team membership.

## Temporary Access

Temporary access must include:

- grant scope
- start time
- expiration time
- granting actor
- affected resource
- audit event

Expired access behaves like revoked access.

## Emergency Access

Emergency contact designation is not emergency data access. If future emergency override is added, it must:

- be time-limited
- be highly visible in audit history
- notify administrators
- expose only minimum necessary data
- require post-event review

## Aide Restrictions

Professional aides or paid caregivers should receive task-specific and schedule-specific access by default. They should not receive document, medication, messaging, or full profile access unless explicitly granted.

## Provider-Scoped Visibility

Provider contacts are address-book entries unless they become authenticated users. Authenticated provider-scoped users should only see explicitly shared conversations, appointments, documents, or messages.

## Document and Imaging Inheritance

Documents may inherit recipient document access by default, but restricted documents require explicit grants. Imaging studies inherit from their source document unless a stricter imaging grant exists.

## Messaging Visibility

Conversation membership controls message visibility. Adding a user to a care team does not automatically add them to restricted conversations. Removing a user from a conversation blocks future message access immediately.

## Care-Recipient Ownership

Care recipients may eventually own or co-administer their care circle, but alpha should model this explicitly rather than assume it. Child, elder, and guardianship scenarios require separate decision records before implementation.

## Archived Recipient Behavior

Archived recipients are read-mostly:

- no routine new tasks
- no new medication schedules
- no new invitations unless restored
- historical data remains permission-protected
- audit events remain available to administrators

## Edge Cases

### Divorced or Shared Custody

Access must support separated administrators with limited cross-visibility. Child profile decisions require explicit guardian model before beta.

### Revoked Sibling Access

Revocation removes inherited team access, cancels future notifications, removes document visibility, and prevents conversation participation unless a narrow explicit grant remains.

### Caregiver Termination

Terminated aides lose task, schedule, document, messaging, and notification access immediately. Audit events must record actor, reason category, and affected scopes.

### Accidental Permission Escalation

Permission changes should be previewable before save and reversible through a revocation path. High-impact grants should produce visible confirmation and audit records.

### Emergency Override Expiration

Emergency overrides, if introduced later, expire automatically and require administrator review. Expired emergency grants must not leave residual document or message access.

### Recipient Death or Archive

Archival preserves history, reduces active reminders, disables routine workflow creation, and keeps permissions enforceable. Deletion requires a separate retention and export policy.

