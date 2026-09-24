# 001: Stack Freeze During Pre-Alpha

Status: Accepted

## Context

Evernest currently runs as a Lovable-generated TanStack Start/Vite prototype. The target production direction is Next.js, Expo, Supabase, Vercel, Sentry, PostHog, Playwright, and Storybook.

## Decision

Freeze the current prototype stack for pre-alpha architecture work. Do not migrate frameworks while entity, permissions, auth, and golden-flow foundations are still unsettled.

## Consequences

- TanStack/Vite remains the working prototype surface.
- Next.js migration requires a separate decision and migration plan.
- Architecture work must avoid locking domain rules into the current routing framework.
- New shared domain, permissions, and database contracts should be framework-portable.

