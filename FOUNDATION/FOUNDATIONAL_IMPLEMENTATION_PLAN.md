# Foundational Implementation Plan

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/development-workflow.md`
- `/Users/TonyWan/Codex Projects/AI-OS/docs/architecture/repo-structure.md`

This plan prevents feature generation from outrunning architecture.

## Phase 1: Governance Baseline

Status: started.

- Establish `FOUNDATION/**` overlays.
- Reference local `AI-OS` as inherited doctrine.
- Define agent scopes.
- Define golden flows.
- Define Evernest scope and medical-adjacent limits.

## Phase 2: Decision Records

Create `docs/decisions/` before stack migration.

Required decisions:

- TanStack/Vite prototype retention vs Next.js migration path
- Vercel deployment architecture
- Supabase project and environment strategy
- Expo app introduction strategy
- analytics policy for PostHog
- error monitoring policy for Sentry

## Phase 3: Permissions and Data Model

Do before persistent feature work.

- Define care-circle roles.
- Define resource permissions.
- Draft Supabase tables.
- Draft RLS policies.
- Draft audit-event model.
- Validate golden flows against permissions.

## Phase 4: Design System Stabilization

- Inventory current route-level UI patterns.
- Extract repeated components only where repetition is proven.
- Document tokens and mobile shell rules.
- Add Storybook once component boundaries are stable.

## Phase 5: Testing Baseline

- Add Playwright smoke tests for current golden-flow routes.
- Add mobile viewport checks.
- Add accessibility checks.
- Add regression notes for permissions-sensitive flows.

## Phase 6: Stack Migration or Hardening

Only after Phases 1-5 have enough structure:

- either harden the current TanStack prototype temporarily
- or migrate toward Next.js/Vercel in controlled slices

No migration should happen as a hidden side effect of feature work.

