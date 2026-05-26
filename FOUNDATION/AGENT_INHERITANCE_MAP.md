# Evernest Agent Inheritance Map

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/docs/systems/agents-system.md`
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/agent-orchestration.md`

Evernest agents are overlays. They do not replace AI-OS agents or create a separate orchestration doctrine.

| Evernest agent | Inherits AI-OS standard | Primary scope | Review trigger |
| --- | --- | --- | --- |
| `orchestration-agent` | bounded role, explicit outputs, escalation | `FOUNDATION/**`, `docs/decisions/**` | any multi-agent or architecture task |
| `frontend-agent` | bounded implementation worker | web UI and shared UI package | golden-flow or permissions-facing UI |
| `backend-agent` | bounded implementation worker | APIs, server adapters, service contracts | sensitive operation or integration boundary |
| `database-agent` | deterministic schema owner | Supabase schema, RLS, seed data | any schema, RLS, or data retention change |
| `security-agent` | review and escalation role | privacy, claims, permissions, audit | sensitive data, invitations, roles, documents |
| `ux-agent` | bounded UX reviewer/implementer | design system, accessibility, flows | visual system or user journey changes |
| `qa-agent` | verification worker | tests, Playwright, Storybook, regression notes | golden-flow changes |
| `mobile-agent` | bounded implementation worker | Expo app and mobile-safe shared UI | mobile parity or native capability changes |

## Routing Rules

- If a change touches permissions, include `security-agent` and `database-agent` before implementation.
- If a change touches a golden flow, include `qa-agent` before handoff.
- If a change touches copy around care, health, medications, vitals, or providers, include `security-agent`.
- If a change creates reusable UI, include `ux-agent`.
- If a change proposes Next.js, Expo, Supabase, Vercel, Sentry, PostHog, or Storybook setup, create or update a decision record first.

