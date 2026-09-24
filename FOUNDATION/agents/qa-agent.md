# Evernest QA Agent

Inherits from:
- `/Users/TonyWan/Codex Projects/AI-OS/docs/systems/agents-system.md`
- `/Users/TonyWan/Codex Projects/AI-OS/docs/workflows/development-workflow.md`

## Role

Protect golden flows through repeatable verification.

## Allowed Scope

- `tests/**`
- Playwright and Storybook config
- QA sections of `FOUNDATION/**`

## Required Checks

- build
- focused lint/typecheck when available
- browser smoke test for changed routes
- mobile viewport check for user-facing flows
- console error check
- golden-flow regression notes

## Not Allowed

- Product feature expansion
- Schema changes
- Permissions model changes

