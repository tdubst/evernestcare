# Evernest Supabase and RLS Architecture

Inherits from:
- `FOUNDATION/DATABASE_RULES.md`
- `FOUNDATION/ENTITY_MODEL.md`
- `FOUNDATION/PERMISSIONS_RUNTIME.md`

This is the pre-migration architecture plan. It does not implement migrations yet.

## Schema Plan

Initial schema groups:

- identity: `users`
- care boundary: `care_recipients`, `care_teams`, `care_team_members`
- authorization: `roles`, `permission_grants`, `audit_events`
- coordination: `appointments`, `medications`, `tasks`, `conversations`, `messages`, `notifications`
- files: `documents`, `imaging_studies`

Every care-related table should include either `care_recipient_id`, `care_team_id`, or a parent reference that resolves to one of those boundaries.

## RLS Philosophy

- RLS is mandatory on every user-accessible table.
- Policies deny by default.
- Read policies use active team membership and active permission grants.
- Write policies require explicit capability, not just visibility.
- Service-role operations are restricted to trusted server paths and audited when they affect sensitive access.

## Ownership Model

| Table | Primary boundary | Owner concept |
| --- | --- | --- |
| `users` | user | self, auth identity |
| `care_recipients` | care recipient | owner/admin role through team |
| `care_teams` | team | owner/admin role |
| `care_team_members` | team | team administrator |
| `permission_grants` | team/resource | granting administrator |
| `appointments` | recipient/team | schedule-capable member |
| `medications` | recipient | medication-capable member |
| `tasks` | recipient/team | creator or assignee plus team grants |
| `conversations` | team/resource | participants/admins |
| `messages` | conversation | author and participants |
| `documents` | recipient/document | uploader/admin/grants |
| `imaging_studies` | document/recipient | document grants |
| `notifications` | user/source | recipient user |
| `audit_events` | team/resource | system |

## Migration Sequencing

1. Enable extensions and shared enums.
2. Create identity and care-boundary tables.
3. Create roles, memberships, permission grants, and audit events.
4. Add RLS helper functions.
5. Enable RLS and policies for identity and boundary tables.
6. Add coordination tables.
7. Add document and imaging tables.
8. Add storage buckets and policies.
9. Add seed data with synthetic-only records.
10. Add policy tests before real alpha data.

## Access Enforcement

Access should be evaluated in layers:

1. authenticated user exists
2. active care-team membership exists
3. role grants baseline capability
4. explicit grants refine resource access
5. resource state allows action
6. archival and revocation rules are checked

## Audit Strategy

Audit events are required for:

- invitation created, accepted, revoked
- role assigned or removed
- permission grant created, changed, expired, revoked
- document shared, restricted, deleted
- care-recipient archived/restored/deleted
- emergency access if ever introduced

Audit events should include actor, target user, resource type, resource ID, care team, care recipient, action, timestamp, and structured metadata.

## Soft Delete Strategy

- Routine user-deletable entities use `deleted_at`.
- Archived entities use `archived_at`.
- Audit events are immutable.
- Storage objects should be isolated from visible metadata and removed only through reviewed lifecycle jobs.

## Storage Security Model

Storage buckets:

- `documents-private`
- `imaging-private`
- future `avatars-public` if needed

Rules:

- private buckets only for care documents and imaging
- storage paths include care recipient and document IDs
- metadata row permission must authorize storage access
- signed URLs should be short-lived
- revocation blocks new URL issuance
- upload completion creates audit event

