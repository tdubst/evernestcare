# Evernest Care Production Readiness Gate

Status: In progress

## Decision

The accepted Beta v0.1.0 package is not production-certified. Production launch requires a separate, fail-closed release gate. A preview deployment or a Vercel production target alone does not satisfy this gate.

## Initial Production Scope

The highest-ROI first production release is the authenticated WebApp only:

- Invite-only sign-in and one authorized family workspace.
- Today with durable care-event and care-note projections.
- Care Circle membership, invitation, and permission workflows.
- Vault document placeholders only.

Calendar mutation, realtime messaging, self-service onboarding, real document upload, native live data, and every share/export path remain unavailable. Production mode hides Calendar and Messages from primary navigation, replaces synthetic onboarding with invite-only sign-in, and cannot activate the beta demo workspace.

## Implemented Foundation

- Production runtime mode requires authenticated routes and cannot use the demo workspace.
- Production Vercel builds fail when production mode, required auth, or public Supabase configuration is missing.
- A browser-exposed Supabase service-role key fails the production build.
- Invite-only email/password sign-in is available for provisioned users.
- Web quality checks run in CI: lint, typecheck, application build, Vercel build, mobile-viewport golden-flow tests, production-boundary tests, accessibility checks, and high-severity production dependency audit.
- Mobile dependency versions are explicit rather than `latest`.
- Hosted responses include restrictive browser security headers and disable unused device permissions.
- A forward migration removes direct API-role mutation access to core product tables and removes public execution of the internal audit helper. It remains unapplied until database review and runtime proof pass.

## Local Verification Status

- `npm run verify`: PASS.
- Production-mode Vercel environment guard and build: PASS with synthetic public configuration.
- Mobile typecheck and iOS export: PASS.
- Root production dependency audit: PASS at high severity; one low development-server advisory remains.
- Mobile production dependency audit: BLOCKED by four high transitive Expo/Metro advisories. Native is excluded from the initial production scope.
- Local Supabase database lint: BLOCKED because Docker/local Postgres is unavailable. No remote migration was applied.

## P0 Launch Gates

- Provision a dedicated production Supabase project and apply only reviewed migrations in order.
- Configure Vercel production with `VITE_APP_MODE=production`, `VITE_REQUIRE_AUTH=true`, a production Supabase URL, and a publishable key. Demo workspace must remain disabled.
- Configure production Auth site URL, redirects, custom SMTP, invite flow, password reset, rate limits, CAPTCHA, and MFA policy.
- Run the authenticated golden-flow matrix with synthetic production-like users: workspace hydration, care event create/read/reload, care notes, Care Circle invitations/permissions, Vault placeholders, denial/revocation, and sign-out.
- Confirm every production table, view, and function has reviewed grants and RLS; rerun database advisors and direct-mutation denial tests.
- Establish backup, restore, retention, deletion, account closure, incident response, and support procedures.
- Obtain legal review for Privacy Policy, Terms, consent language, HIPAA applicability, vendor BAAs, and data-processing obligations before real care data.
- Add privacy-reviewed error monitoring with payload redaction, no session replay, no care content, no auth tokens, and documented retention/access.
- Complete accessibility, cross-browser, performance, and mobile regression with no P0/P1 findings.
- Product, Security/Privacy, Backend, Architecture, UX, and QA must record production go/no-go approval.

## Explicitly Blocked Until Approved

- Real document upload or Supabase Storage.
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
