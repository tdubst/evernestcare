# Sprint 7-10 Beta Continuation Contract

Status: Accepted

## Purpose

This contract implements the post-Sprint-6 continuation path to controlled beta readiness.

It applies only after Sprint 6 Durable Care Notes is accepted. Sprint 7 may start automatically when Sprint 6 has recorded acceptance evidence and no P0 Security/Privacy, permissions, build, or golden-flow blocker remains.

## Source Decisions

- `DECISIONS/008-resource-scoped-permissions-and-provider-prep-gates.md`
- `DECISIONS/009-sprint-7-10-beta-continuation.md`
- `docs/architecture/sprint-5-resource-access-provider-prep-contract.md`
- `docs/architecture/sprint-6-durable-care-notes-contract.md`
- `docs/architecture/sprint-6-durable-care-notes-closeout.md`
- `docs/architecture/sprint-7-care-circle-invitations-permissions-contract.md`
- `docs/architecture/sprint-8-vault-documents-beta-contract.md`
- `docs/architecture/sprint-9-native-ios-beta-baseline-contract.md`
- `docs/architecture/sprint-10-beta-hardening-release-readiness-contract.md`
- `docs/architecture/beta-readiness-principles.md`
- `docs/architecture/hipaa-ready-beta-productization.md`

## Continuation Protocol

At each sprint boundary, Product Planning must record:

- implemented scope
- affected golden flows
- privacy and permissions impact
- QA evidence summary
- unresolved risks or blockers
- explicit next-sprint authorization or remediation status

Use `docs/architecture/sprint-acceptance-evidence-template.md` for the closeout note before automatic continuation.

Each sprint must follow this operating loop:

```text
inspect relevant files -> summarize intended change -> implement narrowly -> verify focused paths -> record acceptance evidence
```

Do not bundle sprint lanes. Sprint 7 collaboration work must not include documents. Sprint 8 document work must not include provider externalization. Sprint 9 Native work must not introduce Apple Health, camera/scanner, or Native share sheet until those contracts are separately accepted.

If a P0 privacy, permissions, build, or golden-flow gate fails, stop automatic continuation and switch to remediation planning.

## Sprint 7: Care Circle, Invitations, And Permissions UX

Goal: make family collaboration usable while preserving fail-closed permissions.

Detailed contract: `docs/architecture/sprint-7-care-circle-invitations-permissions-contract.md`.

Implementation target:

- least-privilege invite flow with role/audience preview, expiration, revoke state, and safe pending/accepted/expired statuses
- Care Circle visibility that shows involvement without leaking raw grants, sensitive role internals, emails, tokens, or backend identifiers
- permissions UX derived from advisory resource projections only
- audit action and metadata allowlists for invite create, accept, revoke, expire, and role update

Required backend and permissions stance:

- RLS/RPC remains authoritative
- stale, revoked, expired, archived, and unrelated-user states fail closed
- invite tokens, raw IDs, emails, grant rows, and grant reasons must not appear in logs, status surfaces, analytics, crash output, AI prompts, or QA evidence

Acceptance:

- Family invitation golden flow passes
- permissions management golden flow passes
- expired, revoked, stale, archived, and unrelated-user denial cases pass
- QA evidence contains aliases, statuses, role/capability keys, and value-safe counts only

## Sprint 8: Vault / Documents Beta Slice

Goal: make Vault useful as continuity memory infrastructure, not generic cloud storage.

Detailed contract: `docs/architecture/sprint-8-vault-documents-beta-contract.md`.

Implementation target:

- narrow artifact model for upload, photo/document placeholder metadata, visibility, and timeline attachment
- storage RLS and resource-scoped access for each artifact
- safe states for empty, loading, upload failure, permission denied, revoked, expired, archived, stale, and unavailable conditions
- audit metadata allowlist for upload, view, attach, revoke, and denied outcomes

Out of scope:

- external sharing/export
- public links
- provider delivery
- document content in Provider Prep
- folder-management complexity

Acceptance:

- document upload golden flow passes
- artifact access is denied for unrelated, revoked, expired, archived, and stale users
- audit metadata excludes document content, titles, tokens, raw errors, and unauthorized resource details
- mobile `390x844` proof passes with readable layout, no overlapping text, and console-clean behavior

## Sprint 9: Native iOS / Mobile Beta Baseline

Goal: make Expo/native iOS beta-ready as an Evernest workstream.

Detailed contract: `docs/architecture/sprint-9-native-ios-beta-baseline-contract.md`.

Implementation target:

- stabilize `apps/mobile` around auth readiness, safe areas, secure token storage, sign-out cleanup, and read-only continuity
- reuse shared domain, permission, Supabase, and redaction conventions where practical without broad monorepo migration
- prepare TestFlight readiness: Expo config, permission copy, EAS build plan, mobile QA checklist, and privacy-safe crash/logging stance
- keep Native iOS under Evernest Family Care rather than a separate product

Deferred until separate accepted contracts:

- Apple Health import
- camera/document scanner
- Native share sheet
- offline cache beyond explicit sign-out cleanup rules

Acceptance:

- mobile typecheck/build path is repeatable
- Native app can show authenticated read-only continuity or safe signed-out/deferred states
- sign-out clears sensitive local state
- TestFlight readiness checklist is complete
- no PHI appears in crash logs, console output, push text, screenshots, or QA evidence

## Sprint 10: Beta Hardening And Release Readiness

Goal: prepare a controlled caregiver beta.

Detailed contract: `docs/architecture/sprint-10-beta-hardening-release-readiness-contract.md`.

Implementation target:

- golden-flow regression coverage for onboarding, care recipient setup, medications, appointments, documents, messages/deferred state, invitations, and permissions
- accessibility and mobile viewport checks for beta-critical surfaces
- privacy-safe monitoring policy for Sentry, PostHog, logs, and any session/capture tooling before real beta users
- beta release notes, known limitations, QA evidence packet, rollback plan, and beta tester onboarding script

Acceptance:

- build and lint status recorded
- golden-flow checklist passes or explicitly defers non-beta flows with safe UI
- privacy leakage scan passes across logs, analytics, crash output, URLs, AI prompts, screenshots, and QA evidence
- beta first-use path is complete: care subject, care circle, medication/basic history, Recent Updates, and provider-ready preview
- Product Planning, Architecture, Security/Privacy, UX, Backend, WebApp, Native, and QA have recorded go/no-go status

## Global No-Go Boundaries

The Sprint 7-10 continuation does not authorize:

- diagnosis
- treatment recommendations
- clinical decision support
- EHR replacement
- telemedicine
- billing
- emergency response
- provider portal behavior
- public links or provider access
- real export/share outside an accepted contract
- commits, deploys, production configuration changes, file moves, folder renames, or deletions unless explicitly requested

## Beta Readiness Definition

Evernest is beta-ready when a caregiver can complete a narrow, trustworthy continuity workflow:

```text
care subject -> care circle -> medication/basic history -> recent updates -> durable notes/documents where authorized -> provider-ready preview
```

The continuity record must remain deterministic, permission-aware, mobile-first, calm, and privacy-safe. Feature breadth is secondary to trust, clarity, and fail-closed behavior.
