# Evernest System Foundation

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/AGENTS.md`
- `/Users/TonyWan/Codex Projects/AI-OS/docs/architecture/system-overview.md`
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/development-workflow.md`

Evernest is a family care coordination platform for shared planning, communication, reminders, documents, and permissions-aware collaboration.

Evernest is not an EHR, diagnostic system, telemedicine product, clinical decision support system, or emergency service.

## Operating Principles

- Mobile-first interfaces are the default.
- Permissions are designed before data exposure.
- Calm, accessible UX takes priority over feature density.
- Care coordination language must avoid diagnostic or treatment claims.
- Architecture changes require explicit review and should be recorded in `docs/decisions/` when they affect stack, data, permissions, or agent scope.
- Shared governance belongs in `AI-OS`; Evernest-specific constraints belong in `FOUNDATION`.

## Stack Direction

Target production stack:

- Web: Next.js, React, TypeScript, Tailwind, shadcn/ui
- Mobile: Expo React Native, NativeWind
- Backend: Supabase, PostgreSQL
- State: Zustand for local client state, React Query for server state
- Deployment: Vercel
- Monitoring: Sentry, PostHog
- Testing: Playwright, Storybook, strict TypeScript

Current implementation is a Lovable-generated TanStack Start/Vite prototype. Do not rewrite it into the target stack without a migration decision and phased plan.

## Change Discipline

Every implementation task must identify:

- affected golden flow, if any
- permission surface touched, if any
- data model touched, if any
- agent responsible for the change
- verification required before handoff

