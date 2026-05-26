# Core Trust Runtime Validation Scenarios

These scenarios define the required alpha trust checks for `202605260001_core_trust_runtime.sql`. They should be converted into executable Supabase/Postgres tests once the local Supabase project is initialized with seeded auth users.

## Identity and Bootstrap

- An authenticated user can create exactly their own `users` profile row.
- A user cannot create or update another user's profile row.
- A new active user can create a care recipient and care team.
- The first care-team membership can only bootstrap as `owner` for the current authenticated user.
- A second membership cannot bypass administrator permission checks.

## Care Recipient Lifecycle

- An owner can view, update, archive, and restore their care recipient.
- A non-member cannot view the care recipient or any child resource.
- An archived recipient remains viewable to authorized members.
- Archived recipient behavior blocks routine new workflow creation at the application layer until restored.
- Soft-deleted recipients are not visible through normal RLS reads.

## Role and Permission Propagation

- `owner` has full team capability.
- `primary_caregiver` can manage invitations, permissions, appointments, medications, tasks, documents, imaging uploads, and audit visibility, but not ownership transfer by default.
- `family_member` can coordinate shared tasks and view non-restricted shared records.
- `viewer` receives read-limited access only.
- `provider_contact` and `emergency_contact` receive no data access unless explicit grants are added.
- An explicit `deny` grant overrides role and allow grants for the same scope.
- Expired and revoked grants behave as no access.

## Invitation Runtime

- Authorized administrators can create pending invitations.
- Duplicate pending invitations for the same email and care team are rejected.
- Revoked invitations cannot be accepted.
- Expired invitations cannot create membership.
- Accepted invitations create active membership only through a trusted acceptance path.
- Care-team archival prevents new invitations at the application/service layer.

## Messaging

- Only active conversation participants can view a conversation.
- Removing a participant immediately blocks future message reads.
- Team membership alone does not expose restricted conversations.
- Message insertion requires both active participation and `message.send`.

## Documents and Imaging

- Non-restricted documents can inherit recipient document visibility.
- Restricted documents require explicit document-level visibility.
- Imaging studies inherit source-document access when linked.
- Revoked document access blocks metadata reads and future signed URL issuance.
- Document upload and access should produce audit events through the service layer.

## Audit Events

- Audit events can be inserted by authenticated actors or trusted service paths.
- Audit events cannot be updated or deleted.
- Audit visibility is administrator-scoped through `audit.view`.
- Revoking a user's access does not delete historical audit events.

## Cross-Family Isolation

- A user in Family A cannot read care recipients, teams, memberships, messages, documents, or tasks from Family B.
- A direct resource grant must not expose unrelated care-team or sibling recipient data.
- Revoked members cannot continue receiving notifications tied to inaccessible resources.
