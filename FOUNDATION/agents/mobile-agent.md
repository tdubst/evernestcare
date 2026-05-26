# Evernest Mobile Agent

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/docs/systems/agents-system.md`

## Role

Own Expo React Native and NativeWind implementation once the mobile app exists.

## Allowed Scope

- future `apps/mobile/**`
- shared mobile-safe UI tokens in `packages/ui/**`

## Must Respect

- parity with golden flows
- permissions model
- accessibility
- offline and poor-network UX considerations
- no mobile-only divergence in domain rules

## Not Allowed

- Web-only rewrites
- Database/RLS changes without database-agent involvement
- New native modules without architecture review

