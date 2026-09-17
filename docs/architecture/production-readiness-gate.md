# Evernest Care Production Readiness Gate

Status: In progress

## Decision

The accepted Beta v0.1.0 package is not production-certified. Production launch requires a separate, fail-closed release gate. A preview deployment or a Vercel production target alone does not satisfy this gate.

## Initial Production Scope

The highest-ROI first production release is the authenticated WebApp only:

- Invite-only sign-in and one authorized family workspace.
- Today with server-derived care-event projections and durable care notes. Medication/check-in mutations remain read-only until their production forms are reviewed.
- Care Circle membership and permission visibility. Invitation creation remains closed until reviewed delivery and activation exist.
- Vault document placeholders only.

Calendar mutation, realtime messaging, self-service onboarding, real document upload, native live data, and every share/export path remain unavailable. Production mode hides Calendar and Messages from primary navigation, replaces synthetic onboarding with invite-only sign-in, and cannot activate the beta demo workspace.

## Implemented Foundation

- Production runtime mode requires authenticated routes and cannot use the demo workspace.
- Production Vercel builds fail when production mode, required auth, or public Supabase configuration is missing.
- A browser-exposed Supabase service-role key fails the production build.
- Invite-only email/password sign-in is available for provisioned users.
- Password recovery uses generic responses, bounded network waits, and an authenticated reset path without exposing account existence.
- Production workspace hydration is read-only. It cannot create an app user, recipient, team, or owner membership.
- Today medication/check-in mutation controls are closed in production; existing server-derived events remain readable. Durable care notes render only after persistence and read-back, and failed writes do not remain visible locally.
- Production invitation creation is disabled in both WebApp UI and function grants until delivery/activation is implemented and reviewed.
- Web quality checks run in CI: lint, typecheck, application build, Vercel build, mobile-viewport golden-flow tests, production-boundary tests, accessibility checks, and high-severity production dependency audit.
- Vercel route chunks are split and the largest JavaScript asset is held to an explicit raw/gzip budget.
- Every Vercel build emits a non-sensitive release manifest containing only app mode, commit SHA, Vercel deployment ID, deployment environment, and package version.
- Production deployment is manual and approval-gated: only the exact current `main` SHA can pass, the full verification suite runs again, and promotion is accepted only after the production URL reports that exact SHA with production security headers.
- Mobile dependency versions are explicit rather than `latest`.
- Hosted responses include restrictive browser security headers and disable unused device permissions.
- Forward migrations remove direct mutation access for `PUBLIC`, `anon`, and `authenticated`, remove public execution of the internal audit helper and bootstrap helper, and close production workspace/invitation provisioning RPCs. They remain unapplied until database review and runtime proof pass.
- A forward migration removes PostgreSQL's default `PUBLIC` access to the API schema while preserving explicit access for `anon`, `authenticated`, and `service_role`.

## Local Verification Status

- `npm run verify`: PASS.
- Browser suites: 42 Beta/accessibility/golden-flow checks and 18 production-boundary/auth-recovery/public-resource/read-only-hydration checks PASS across mobile Chromium, mobile WebKit, and desktop Firefox.
- Production SQL posture and Vercel bundle-budget checks: PASS.
- Production-mode Vercel environment guard and build: PASS with synthetic public configuration.
- Mobile typecheck and iOS export: PASS.
- Root production dependency audit: PASS at high severity; one low development-server advisory remains.
- Mobile production dependency audit: BLOCKED by four high transitive Expo/Metro advisories. Native is excluded from the initial production scope.
- Local Supabase database lint: BLOCKED because Docker/local Postgres is unavailable. No remote migration was applied.

## P0 Launch Gates

- Provision a dedicated production Supabase project and apply only reviewed migrations in order.
- Configure Vercel production with `VITE_APP_MODE=production`, `VITE_REQUIRE_AUTH=true`, a production Supabase URL, a publishable key, and counsel-approved public HTTPS URLs for Privacy Policy, Terms, and Support. Demo workspace must remain disabled.
- Configure production Auth site URL, redirects, custom SMTP, administrative user provisioning, password reset, rate limits, CAPTCHA, and MFA policy.
- Run the authenticated golden-flow matrix with synthetic production-like users: read-only workspace hydration, care event read/reload, care-note create/read/reload, Care Circle permission visibility, Vault placeholders, denial/revocation, password recovery, and sign-out.
- Confirm every production table, view, and function has reviewed grants and RLS; rerun database advisors and direct-mutation denial tests.
- Establish backup, restore, retention, deletion, account closure, incident response, and support procedures.
- Obtain legal review for Privacy Policy, Terms, consent language, HIPAA applicability, vendor BAAs, and data-processing obligations before real care data.
- Publish the approved Privacy Policy, Terms, and Support pages on the exact checked-in first-party host allowlist; each page must return successfully without unsafe redirects or authentication.
- Add privacy-reviewed error monitoring with payload redaction, no session replay, no care content, no auth tokens, and documented retention/access.
- Complete accessibility, cross-browser, performance, and mobile regression with no P0/P1 findings.
- Product, Security/Privacy, Backend, Architecture, UX, and QA must record production go/no-go approval.

## Explicitly Blocked Until Approved

- Real document upload or Supabase Storage.
- Care Circle invitation creation, email delivery, and invitation activation.
- Medication/check-in creation until reviewed production input forms and payload validation are complete.
- Share/export, public links, or provider delivery.
- Native live data, TestFlight submission, push details, camera/scanner, Apple Health, or offline care cache.
- Analytics, crash capture, or session replay that can receive care content.
- Production promotion, custom-domain cutover, or real-user onboarding before all P0 launch gates pass.

## Production Verification Commands

Follow the [production operations runbook](./production-operations-runbook.md) for backup/restore, retention/deletion, incident response, monitoring, support, and launch evidence. The runbook is not accepted until its drills and owner decisions are recorded.

Record every required result and owner decision in the [production launch packet](./production-launch-packet.md). The packet must remain `Not approved` until every P0 gate has authoritative evidence.

Before the first production-mode promotion, the one-time `bootstrap-production-baseline.yml` workflow must verify and record the existing rollback baseline. The normal production release workflow remains fail-closed until that baseline exposes a matching release manifest.

```text
npm ci
npm run verify
npm audit --omit=dev --audit-level=high
cd apps/mobile && npm ci && npm run typecheck
```

Production deployments must additionally pass `scripts/validate-production-env.mjs` through the Vercel build command.

The GitHub `production` environment must require reviewer approval, restrict deployments to `main`, disable administrator bypass, and contain only these deployment secrets:

- `VERCEL_TOKEN`, a short-lived Vercel access token with only the required project deployment access.
- `VERCEL_ORG_ID`, the owning Vercel team identifier.
- `VERCEL_PROJECT_ID`, the Evernest Care Vercel project identifier.
- `PRODUCTION_HEALTHCHECK_URL`, the canonical HTTPS production origin.

The GitHub `staging` environment must require reviewer approval, restrict deployments to `main`, disable administrator bypass, and contain the eight isolated proof secrets required by `npm run test:staging`: least-privilege verifier database URL, Supabase URL, publishable key, owner email/password, revoked-user email/password, and sentinel event ID. It must also contain expected-project, protected-project, and project-bound verification values as environment variables. The reviewed release SHA deterministically identifies each proof. These values must match the repository project registry and identify the dedicated staging project, never the accepted beta/synthetic project, PokerOS, or production. Database URLs must require `verify-full` TLS. The administrative provisioning database URL must never be stored in GitHub Actions. The external environment rule is authoritative; the workflow's own branch check is defense in depth.

Automatic Git deployment from `main` is disabled in `vercel.json`. Vercel's **Auto-assign Custom Production Domains** project setting must also remain disabled; the release workflow fails closed if the project API reports otherwise. Release operators must invoke the `Production Release` workflow with the full current `main` SHA and the exact confirmation `RELEASE`. The workflow reruns all checks and the isolated staging database proof before approval, creates a non-aliased production deployment from the exact verified GitHub SHA, verifies its release manifest and signed-out browser boundary, confirms the current production target has not changed out of band, promotes that exact deployment, and repeats both checks against the canonical production URL. If a post-promotion check fails or is canceled, recovery restores the prior production deployment, confirms the project target points to the prior deployment ID, and verifies the restored browser shell. Rotate the Vercel token after a release or configure a short expiration.

## Isolated Staging Verification

Run the authenticated database boundary proof only against a dedicated, non-production Supabase project after all migrations are applied and an owner fixture is administratively provisioned. The verifier emits pass/fail labels only; it does not print credentials, identifiers, RPC bodies, or care content.

Follow the [production staging runbook](./production-staging-runbook.md) for project separation, ordered migration application, Auth configuration, synthetic owner provisioning, authenticated proof, and evidence handling.

Required local environment variables:

- `STAGING_VERIFIER_DATABASE_URL`
- `STAGING_EXPECTED_PROJECT_REF`
- `STAGING_PROTECTED_PROJECT_REFS`
- `STAGING_RELEASE_SHA`
- `STAGING_SENTINEL_EVENT_ID`
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_PUBLISHABLE_KEY`
- `STAGING_OWNER_EMAIL`
- `STAGING_OWNER_PASSWORD`
- `STAGING_REVOKED_EMAIL`
- `STAGING_REVOKED_PASSWORD`
- `STAGING_VERIFY_CONFIRMATION`

```text
npm run test:staging
```

Before running the proof, set the staging database sentinel once through the Supabase SQL editor or another reviewed administrator connection, then reconnect:

```sql
alter database postgres set app.environment = 'staging';
```

The API URL and database URL must identify the same project. The proof refuses to continue unless the database itself reports the `staging` sentinel, the closed RPC/table privileges are revoked for both API roles, and the content-free sentinel care event exists. It then requires successful owner authentication, server-side user validation, read-only hydration of one pre-provisioned workspace, Care Circle/Vault/sentinel-event reads, durable care-note create/read/reload through the approved RPC, API-level denial of every closed RPC and direct table mutation, revoked-user authentication with workspace/event denial, unchanged workspace records, and an intact sentinel event. Do not run it against production or the accepted Beta project.
