# Evernest Architecture Overlay

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/docs/architecture/repo-structure.md`
- `/Users/TonyWan/Codex Projects/AI-OS/docs/architecture/system-overview.md`

## Current State

The current repository is a compact prototype:

- `src/routes`: route-level screens and flow prototypes
- `src/components/ui`: shadcn/Radix primitives
- `src/styles.css`: Tailwind theme tokens and mobile shell utilities
- `src/lib`: error handling and utility helpers
- `src/server.ts`: TanStack Start SSR wrapper for Cloudflare-style deployment

There is no production backend, Supabase schema, mobile app, permissions engine, analytics layer, e2e test suite, Storybook, or Next.js application yet.

## Target Shape

The production architecture should evolve toward:

```text
apps/
  web/
  mobile/
packages/
  ui/
  config/
  domain/
  permissions/
  database/
  analytics/
supabase/
  migrations/
  policies/
  seed/
tests/
  e2e/
  accessibility/
  golden-flows/
docs/
  decisions/
  product/
  security/
FOUNDATION/
```

## Migration Rule

Do not perform a broad stack migration as an incidental feature task. Moving from the current TanStack/Vite prototype to Next.js/Vercel requires:

- written decision record
- route inventory
- golden-flow regression checklist
- component migration map
- data and permissions migration plan
- rollback strategy

## Module Boundaries

- Product screens must not own durable domain rules.
- Permissions logic must not be embedded in visual components.
- Server state belongs behind typed query/mutation contracts.
- Local UI state may use component state initially; shared local state should move to Zustand only when multiple surfaces need it.
- Database access must flow through typed adapters and Supabase RLS, not ad hoc client queries spread across screens.

