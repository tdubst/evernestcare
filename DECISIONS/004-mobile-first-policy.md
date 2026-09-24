# 004: Mobile-First Policy

Status: Accepted

## Context

Evernest is primarily used by caregivers in fragmented, stressful moments. Mobile clarity matters more than desktop density.

## Decision

All core flows are designed and tested mobile-first. Desktop may provide more space, but must not introduce separate domain behavior.

## Requirements

- Primary golden-flow QA uses mobile viewport checks.
- Tap targets must be accessible.
- Forms must support one-handed completion where practical.
- Bottom navigation and sheets are acceptable mobile primitives.
- Desktop layouts must not become dashboard-heavy.

