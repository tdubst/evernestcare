# Evernest Permissions Model

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/agent-orchestration.md`
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/development-workflow.md`

Permissions are Priority 1 for Evernest.

## Core Concepts

- `User`: authenticated account.
- `Care recipient`: person receiving coordinated care.
- `Care circle`: collaboration group around one care recipient.
- `Member`: user participating in a care circle.
- `Role`: named responsibility bundle.
- `Permission`: explicit capability on a resource or resource class.
- `Invitation`: pending access grant.
- `Audit event`: immutable record of sensitive access or role changes.

## Initial Roles

- `owner`: created the care circle or has transferred ownership.
- `primary_caregiver`: manages day-to-day coordination.
- `family_member`: participates in shared updates and tasks.
- `provider_contact`: visible as a contact or message participant, not a clinician portal by default.
- `viewer`: read-limited participant.
- `emergency_contact`: contact role, not full app access unless separately granted.

## Permission Areas

- profile overview
- medications
- vitals
- appointments
- documents
- messages
- care team
- invitations
- permissions administration

## Required Rules

- Permissions must be explicit and inspectable by users.
- Invited users should receive least privilege by default.
- Emergency contact status must not imply full data access.
- Provider contact status must not imply clinical system access.
- Document access must support per-document grants.
- Medication and vitals logs must be scoped to a care recipient.
- Permission changes must produce audit events.
- RLS must enforce every user-accessible resource boundary.

## Open Questions

- Can a care recipient own or administer their own care circle?
- What is the minimum age/guardian model for child profiles?
- Should provider contacts have account access or remain address-book entries until invited?
- What retention policy applies to deleted messages and documents?

