# HIPAA-Ready Beta Productization

EvernestCare should be treated as a sensitive care coordination product even before formal HIPAA applicability is finalized. This document defines product and engineering guardrails for beta work; it is not a legal certification plan.

## Sensitive Surfaces

Treat the following as PHI-sensitive by default:

- care recipients and care circles
- medications, adherence, vitals, appointments, care notes, messages, documents, artifacts, and provider summaries
- exports, share links, invitation links, uploaded files, device-imported data, and audit events

UI labels should make visibility understandable without adding clinical bureaucracy:

- Family visible
- Provider summary visible
- Private
- Expires after visit

## Product Boundaries

EvernestCare supports family coordination, continuity history, factual summaries, and visit preparation. It must not present itself as diagnosis, treatment guidance, clinical decision support, a provider portal, or an EHR replacement.

Continuity signals remain operational awareness only. Provider summaries must remain factual, deterministic, event-derived, and non-diagnostic.

## Privacy-Safe Interactions

Share and export actions must show:

- recipient or audience
- visible content category
- expiration or intended use window
- non-diagnostic framing

Artifacts and provider summaries may be marked provider-visible, family-visible, private, or visit-scoped. Future persistence must audit create, view, share, export, revoke, upload, and delete actions.

## Logging And Vendor Safety

No PHI should be sent to analytics, crash logs, console output, AI prompts, or session replay. Before production PHI, each vendor that touches sensitive data must be reviewed for HIPAA suitability and BAA availability.

Initial vendor review targets:

- Supabase
- Vercel
- Sentry
- PostHog
- email and push notification providers
- file storage and document scanning services

Push notification text should avoid PHI. Prefer neutral copy such as "EvernestCare update ready" over medication names, diagnoses, or recipient details.

## Native iOS Readiness

The recommended native path is Expo React Native with shared domain logic, not a Capacitor wrapper. Shared code candidates include health events, projections, permissions, Supabase types/client conventions, and redaction helpers.

Native iOS requirements:

- safe area support for headers, sheets, and bottom navigation
- secure token storage
- no PHI in crash logs or push text
- native share sheet for provider summaries
- camera and document scanner for Vault artifacts
- Apple Health permission flow before vitals import
- optional haptics for save, mark taken, upload, and share confirmations
- clear offline cache and sign-out cleanup rules

## Beta Acceptance

Beta screens should feel complete even when data remains local. Every visible action should either complete a local workflow, open a confirmation sheet, or clearly state that the capability is planned. Avoid dead buttons.
