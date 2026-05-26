# 002: Auth Strategy

Status: Proposed

## Context

Evernest has no authentication, no protected routes, and no persisted user model. Permissions cannot be trusted until identity is stable.

## Decision

Use Supabase Auth as the alpha identity provider. Treat Supabase user IDs as authentication identifiers, not as the full Evernest user domain model.

## Direction

- `auth.users.id` maps to `users.auth_user_id`.
- App user profile data lives in an application table.
- Protected application routes require an authenticated session.
- Onboarding gates must create or confirm the current user's app profile before care-recipient setup.
- Role and permission hydration happens after session establishment.

## Open Questions

- Which login methods are allowed for alpha: email OTP, magic link, OAuth, or password?
- Should invited users enter through invitation-token acceptance before normal onboarding?
- What is the minimum session persistence policy for shared family devices?

