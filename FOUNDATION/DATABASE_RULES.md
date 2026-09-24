# Evernest Database Rules

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/development-workflow.md`

## Backend Direction

The target backend is Supabase with PostgreSQL and Row Level Security.

No production table should be added without:

- owner purpose
- permission model
- RLS policy
- audit implications
- data retention expectation
- golden flow that depends on it

## Core Entity Direction

Expected domain areas:

- users and profiles
- care recipients
- care teams
- care team memberships
- invitations
- roles and permissions
- medications and medication logs
- appointments and appointment participants
- documents and document access grants
- messages and threads
- emergency contacts
- audit events

## Database Non-Negotiables

- RLS is required for every user-accessible table.
- Application code must not rely on frontend filtering for privacy.
- Permission checks must be enforced server-side and at the database layer.
- Protected health-adjacent content requires explicit scope and access grants.
- Audit logs are required for permission changes, invitation changes, document access, and role changes.
- Seed data must never include real patient or family information.

## Naming

Use calm, domain-specific names:

- `care_recipients`
- `care_teams`
- `care_team_members`
- `permission_grants`
- `medication_logs`
- `appointment_participants`
- `document_access_grants`

Avoid clinical/EHR language unless the product is explicitly modeling a user-supplied document or provider contact.
