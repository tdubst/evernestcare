# 003: Permissions Philosophy

Status: Accepted

## Context

Evernest is permissions-sensitive because families coordinate around private health-adjacent information, documents, appointments, messages, and caregiver responsibilities.

## Decision

Permissions are explicit, least-privilege, inspectable, revocable, and enforced by database RLS. UI filtering is not a security boundary.

## Principles

- Care-recipient access is not global account access.
- Emergency contact status does not grant full app access.
- Provider contact status does not create provider-portal privileges.
- Document access may be narrower than care-team access.
- Revocation must propagate to dependent resources.
- Sensitive access changes require audit events.

## Consequences

- Permission checks must exist before production persistence for golden flows.
- Tables must be designed around care-recipient and care-team boundaries.
- RLS policies are required before alpha data leaves synthetic use.

