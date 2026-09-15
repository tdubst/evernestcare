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

## Local Verification Status

- `npm run verify`: PASS.
- Browser suites: 14 Beta/accessibility/golden-flow checks and 5 production-boundary/auth-recovery/read-only-hydration checks PASS.
- Production SQL posture and Vercel bundle-budget checks: PASS.
- Production-mode Vercel environment guard and build: PASS with synthetic public configuration.
- Mobile typecheck and iOS export: PASS.
- Root production dependency audit: PASS at high severity; one low development-server advisory remains.
- Mobile production dependency audit: BLOCKED by four high transitive Expo/Metro advisories. Native is excluded from the initial production scope.
- Local Supabase database lint: BLOCKED because Docker/local Postgres is unavailable. No remote migration was applied.

## P0 Launch Gates

- Provision a dedicated production Supabase project and apply only reviewed migrations in order.
- Configure Vercel production with `VITE_APP_MODE=production`, `VITE_REQUIRE_AUTH=true`, a production Supabase URL, and a publishable key. Demo workspace must remain disabled.
- Configure production Auth site URL, redirects, custom SMTP, administrative user provisioning, password reset, rate limits, CAPTCHA, and MFA policy.
- Run the authenticated golden-flow matrix with synthetic production-like users: read-only workspace hydration, care event read/reload, care-note create/read/reload, Care Circle permission visibility, Vault placeholders, denial/revocation, password recovery, and sign-out.
- Confirm every production table, view, and function has reviewed grants and RLS; rerun database advisors and direct-mutation denial tests.
- Establish backup, restore, retention, deletion, account closure, incident response, and support procedures.
- Obtain legal review for Privacy Policy, Terms, consent language, HIPAA applicability, vendor BAAs, and data-processing obligations before real care data.
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

The GitHub `staging` environment must require reviewer approval, restrict deployments to `main`, disable administrator bypass, and contain the six isolated proof values required by `npm run test:staging`: database URL, Supabase URL, publishable key, owner email/password, and sentinel event ID. These must identify the dedicated staging project, never the accepted beta/synthetic project or production. The external environment rule is authoritative; the workflow's own branch check is defense in depth.

Automatic Git deployment from `main` is disabled in `vercel.json`. Vercel's **Auto-assign Custom Production Domains** project setting must also remain disabled; the release workflow fails closed if the project API reports otherwise. Release operators must invoke the `Production Release` workflow with the full current `main` SHA and the exact confirmation `RELEASE`. The workflow reruns all checks and the isolated staging database proof before approval, creates a non-aliased production deployment from the exact verified GitHub SHA, verifies its release manifest and signed-out browser boundary, confirms the current production target has not changed out of band, promotes that exact deployment, and repeats both checks against the canonical production URL. If a post-promotion check fails or is canceled, recovery restores the prior production deployment, confirms the project target points to the prior deployment ID, and verifies the restored browser shell. Rotate the Vercel token after a release or configure a short expiration.

## Isolated Staging Verification

Run the authenticated database boundary proof only against a dedicated, non-production Supabase project after all migrations are applied and an owner fixture is administratively provisioned. The verifier emits pass/fail labels only; it does not print credentials, identifiers, RPC bodies, or care content.

Required local environment variables:

- `STAGING_DATABASE_URL`
- `STAGING_SENTINEL_EVENT_ID`
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_PUBLISHABLE_KEY`
- `STAGING_OWNER_EMAIL`
- `STAGING_OWNER_PASSWORD`

```text
npm run test:staging
```

Before running the proof, set the staging database sentinel once through the Supabase SQL editor or another reviewed administrator connection, then reconnect:

```sql
alter database postgres set app.environment = 'staging';
```

The API URL and database URL must identify the same project. The proof refuses to continue unless the database itself reports the `staging` sentinel, the closed RPC/table privileges are revoked for both API roles, and the content-free sentinel care event exists. It then requires successful password authentication, server-side user validation, read-only hydration of one pre-provisioned workspace, Care Circle/Vault/sentinel-event reads, API-level denial of every closed RPC and direct table mutation, unchanged workspace records, and an intact sentinel event. Do not run it against production or the accepted Beta project.
