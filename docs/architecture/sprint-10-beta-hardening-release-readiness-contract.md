# Sprint 10 Beta Hardening And Release Readiness Contract

Status: Accepted for planning

## Purpose

Sprint 10 prepares Evernest for a controlled caregiver beta. It hardens the narrow beta workflow instead of adding feature breadth.

## Implementation Target

- Record golden-flow regression coverage for onboarding, care recipient setup, medications, appointments, documents, messages/deferred state, invitations, and permissions.
- Complete accessibility and mobile viewport checks for beta-critical surfaces.
- Define privacy-safe monitoring policy for Sentry, PostHog, logs, crash output, analytics, and any session/capture tooling before real beta users.
- Produce beta release notes, known limitations, QA evidence packet, rollback plan, and beta tester onboarding script.
- Collect Product Planning, Architecture, Security/Privacy, UX, Backend, WebApp, Native, and QA go/no-go status.

## Required Contracts And Boundaries

- Beta readiness means a trustworthy narrow caregiver workflow, not full feature breadth.
- Non-beta flows may be explicitly deferred only if they have safe UI states and no dead controls.
- No PHI in logs, analytics, crash output, URLs, AI prompts, screenshots, QA evidence, push text, or session replay.
- Provider externalization, real export/share, public links, provider portal behavior, diagnosis, treatment guidance, clinical decision support, EHR replacement, telemedicine, billing, and emergency response remain out of scope unless separately accepted.

## Beta Acceptance Path

The beta first-use path must be complete and evidence-backed:

```text
care subject -> care circle -> medication/basic history -> Recent Updates -> durable notes/documents where authorized -> provider-ready preview
```

Provider-ready preview remains factual, deterministic, event-derived, and non-diagnostic. External delivery remains out of scope unless a later contract approves it.

## QA Acceptance

- Build and lint status are recorded.
- Golden-flow checklist passes or explicitly defers non-beta flows with safe UI.
- Mobile `390x844` and accessibility smoke pass for beta-critical surfaces.
- Privacy leakage scan passes across logs, analytics, crash output, URLs, AI prompts, screenshots, session/capture tooling, and QA evidence.
- Regression evidence includes permissions boundary checks for unrelated, revoked, expired, archived, stale, and denied users where applicable.
- Release notes, known limitations, rollback plan, beta tester onboarding script, and go/no-go packet are complete.

## Final Gate

Controlled beta may start only after all Sprint 10 go/no-go owners record acceptance and no P0 Security/Privacy, permissions, build, mobile, monitoring, or golden-flow blocker remains.
