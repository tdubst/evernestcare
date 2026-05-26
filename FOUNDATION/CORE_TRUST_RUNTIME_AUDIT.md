# Core Trust Runtime Audit

Sprint: `alpha/core-trust-runtime`

This audit validates alignment between `ENTITY_MODEL.md`, `PERMISSIONS_RUNTIME.md`, `RLS_ARCHITECTURE.md`, the current Supabase auth shell, permission provider, and route structure before persistence implementation.

## Trust-Runtime Risk Analysis

- Auth foundation is intentionally thin: Supabase session state exists, but database profile hydration and role hydration are not yet wired into the UI.
- Permission context currently exposes no persisted grants. Database RLS must be treated as the source of truth until client hydration is implemented.
- Prototype routes still render static care data after authentication. This is acceptable for protected-shell validation, but alpha persistence work must replace mock state flow by flow.
- Conversation history after revocation remains a beta privacy decision. Alpha RLS enforces current active participant visibility and does not preserve revoked historical message access.
- Emergency contact designation is modeled as a role without default data access. Emergency override remains explicitly out of scope.

## Schema Conflict Report

- `Invitation` was referenced by permissions and RLS guidance but missing from `ENTITY_MODEL.md`; this sprint adds it as canonical authority before creating the `invitations` table.
- `care_team_members` is not a standalone product entity, but it is required as the relationship table connecting `User`, `CareTeam`, and `Role`.
- Earlier foundation language uses "care circle" conceptually. Runtime schema standardizes on `care_teams` to match `ENTITY_MODEL.md` and current architecture docs.
- Provider contacts and emergency contacts are roles, not privileged portals. They receive no default account access unless explicit grants exist.

## Unresolved Edge Cases

- Guardian/custody authority for child recipients requires a future decision record before closed beta.
- Recipient self-administration is not assumed in alpha and requires explicit future modeling.
- Historical message visibility after user revocation requires a retention/privacy decision.
- Storage object deletion policy needs reviewed lifecycle jobs before production data deletion.
- Invitation acceptance by raw token should run through a trusted server path; direct client RLS is limited to visible invitation records.

## Migration Dependency Order

1. Enable extensions and shared timestamp trigger.
2. Create identity, care-recipient, care-team, role, membership, invitation, permission, coordination, document, notification, and audit tables.
3. Seed canonical role definitions.
4. Add indexes and update triggers.
5. Add RLS helper functions.
6. Enable RLS on every user-accessible table.
7. Add policies for identity, care boundaries, invitations, permissions, coordination records, documents, messaging, notifications, and audit events.
8. Add storage bucket policies after Supabase storage is configured.
9. Run RLS scenario tests against a local or staging Supabase project before real alpha data.
