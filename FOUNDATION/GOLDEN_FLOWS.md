# Evernest Golden Flows

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/workflows.md`
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/development-workflow.md`

Golden flows are protected user journeys. Changes touching them require explicit verification.

## Protected Flows

1. Caregiver onboarding
2. Care recipient creation
3. Family invitation flow
4. Medication tracking
5. Appointment management
6. Document upload
7. Messaging
8. Permissions management

## Verification Requirements

Each golden flow should eventually have:

- route-level smoke test
- Playwright e2e path
- accessibility check
- permission boundary test
- empty/loading/error state coverage
- mobile viewport screenshot

## Current Prototype Coverage

Current route equivalents:

- onboarding: `src/routes/onboarding.tsx`
- care recipient/profile setup: `src/routes/profile-types.tsx`
- medication tracking: `src/routes/_tabs.today.tsx`, `src/routes/_tabs.calendar.tsx`
- appointment management: `src/routes/_tabs.calendar.tsx`
- document organization: `src/routes/_tabs.vault.tsx`
- messaging: `src/routes/_tabs.messages.tsx`
- permissions/circle: `src/routes/_tabs.care-team.tsx`

These are prototype surfaces, not production-certified flows.

