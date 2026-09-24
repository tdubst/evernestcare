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
- Pre-promotion and post-promotion browser verification requires the exact checked-in Privacy Policy, Terms, and Support URLs to return public HTML directly, without redirects or authentication, on an approved first-party host with an accessible page heading.
- The initial canonical host is the Vercel-owned `https://evernestcare.vercel.app` origin. The project does not control `evernestcare.com`, so production validation must not depend on that domain. Privacy Policy, Terms, and Support are first-party routes on the canonical Vercel origin.
- Forward migrations remove direct mutation access for `PUBLIC`, `anon`, and `authenticated`, remove public execution of internal helpers, enforce an explicit authenticated RPC/RLS-helper allowlist, fix public-function search paths, and close production workspace/invitation provisioning RPCs.
- A forward migration removes PostgreSQL's default `PUBLIC` access to the API schema while preserving explicit access for `anon`, `authenticated`, and `service_role`.

## Local Verification Status

- `npm run verify`: PASS.
- Browser suites: 42 Beta/accessibility/golden-flow checks and 24 production-boundary/auth-recovery/public-resource/read-only-hydration/sign-out/performance checks PASS across mobile Chromium, mobile WebKit, and desktop Firefox.
- Production SQL posture and Vercel bundle-budget checks: PASS.
- Production-mode Vercel environment guard and build: PASS with synthetic public configuration.
- Mobile typecheck and iOS export: PASS.
- Root production dependency audit: PASS at high severity; one low development-server advisory remains.
- Mobile production dependency audit: BLOCKED by four high transitive Expo/Metro advisories. Native is excluded from the initial production scope.
- Isolated Supabase staging schema: migrations through `20260923220633_production_policy_and_fk_index_hardening.sql` are applied only to the registered staging project. The private staging sentinel is active. Live checks confirm zero anonymous public-function/table access, zero mutable function search paths, zero direct-write policies, zero unindexed foreign keys, and a valid least-privilege closure-operator posture. No accepted Beta or production project was changed.
- Staging security advisors report the 19 intentionally signed-in `SECURITY DEFINER` functions in the explicit production RPC/RLS-helper allowlist plus a separate leaked-password-protection warning. Architecture, Backend, Security/Privacy, and QA accept the exact allowlist as a bounded initial-release exception after the helper-oracle staging proof. This focused exception acceptance is not overall production GO. The staging organization is currently on the Free plan; leaked password protection requires Supabase Pro or above and remains a P0 launch gate for the email/password production boundary. Performance advisors report only unused indexes in the low-traffic synthetic staging environment.
- Authenticated isolated-staging proof last passed on September 24, 2026 for commit `ea67231`. The proof covered owner and revoked-user authentication, read-only workspace hydration, the seven helper functions against owner, revoked, and unrelated identifiers, durable care-note create/read/reload, Care Circle and Vault projections, closed RPC denial, 54 direct table mutation denials, unchanged workspace records, and sentinel integrity. Every helper result was limited to the expected self-ID or boolean outcome. The verifier binds every run to the supplied full release SHA; it must run again for the final reviewed `main` SHA before promotion. Formal production GO remains pending until the final result is archived in the approved restricted evidence system and referenced by the launch packet.
- The latest exact-SHA production-mode candidate passed hosted owner sign-in, visible sign-out, return to the public entry, and post-sign-out protected-route denial across mobile Chromium, mobile WebKit, and desktop Firefox. Preview-only CSP messages show the application correctly blocking the `vercel.live` toolbar script; no sensitive console output was observed.
- Vercel **Auto-assign Custom Production Domains** is disabled for the project. This setting must remain disabled and is rechecked by both release workflows before any promotion.

## Authenticated Function Exception

The initial production boundary permits exactly 19 authenticated `SECURITY DEFINER` functions. Any additional authenticated function, any anonymous public-function execution, or any mutable `SECURITY DEFINER` search path fails the migration assertions and production SQL posture checks.

The 12 reviewed product APIs are `append_care_event`, `attach_vault_artifact_to_timeline`, `create_vault_artifact_placeholder`, `get_artifact_access_advisory_summary`, `get_care_circle_summary`, `get_permissions_advisory_summary`, `get_vault_artifact_summary`, `hydrate_care_circle_context`, `hydrate_permission_context`, `hydrate_resource_access_context`, `list_care_circle_invitations`, and `list_vault_artifacts`.

The seven bounded RLS-helper exceptions are `current_app_user_id`, `has_active_team_membership`, `has_team_capability`, `has_resource_capability`, `can_view_recipient`, `can_view_conversation`, and `can_view_document`. Active SELECT policies depend on these helpers, so an ACL-only revoke would break authorized reads. The exact-SHA staging verifier proves that owner, revoked-user, and unrelated identifiers yield only the expected self-ID or boolean result, with no content or detail returned. This exception is not approval for broader self-service, sharing/export, invitation delivery, real file storage, or Native live data and must be revisited before any such expansion.

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

Before the first production-mode promotion, the one-time `bootstrap-production-baseline.yml` workflow must verify the existing legacy rollback target and archive its exact deployment identity. The legacy target predates `release.json`, the production security-header policy, and may retain its original beta-branch source ref. The bootstrap therefore accepts only the observed HTML SPA fallback at the manifest path, a matching Vercel production target and repository, a deployment commit that is an ancestor of final `main`, and a passing `legacy-rollback` browser-shell/mobile-layout check. This is an explicitly degraded one-time rollback exception, not production acceptance. The first `Production Release` run must reference that successful bootstrap workflow run and use the separate `USE VERIFIED LEGACY BASELINE` confirmation. Once a manifest-bearing release is serving production, the legacy path fails closed automatically and every later release requires a matching release manifest from `main` and the full security-header boundary.

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

The GitHub `staging` environment must require reviewer approval, restrict deployments to `main`, disable administrator bypass, and contain the eight isolated proof secrets required by `npm run test:staging`: least-privilege verifier database URL, Supabase URL, publishable key, owner email/password, revoked-user email/password, and sentinel event ID. It must also contain expected-project, protected-project, and project-bound verification values as environment variables. The reviewed release SHA deterministically identifies each proof. These values must match the repository project registry and identify the dedicated staging project, never the accepted beta/synthetic project, PokerOS, or production. Database URLs must require `verify-full` TLS, and Node must load the reviewed Supabase database CA from `config/supabase-prod-ca-2021.crt` through `NODE_EXTRA_CA_CERTS`. The release guard pins the certificate SHA-256 digest. The administrative provisioning database URL must never be stored in GitHub Actions. The external environment rule is authoritative; the workflow's own branch check is defense in depth.

Before final launch approval, run `.github/workflows/verify-production-staging.yml` from `main` with the full current `main` SHA and confirmation `VERIFY STAGING`. It is a non-deploying evidence workflow: it requires staging-environment approval, independently binds the checkout and remote `main` to the requested SHA, runs the authenticated verifier, and retains only content-free supporting output for 30 days. The public-repository artifact is not the restricted evidence record; an approved operator must archive the accepted result and run identity in the separate restricted evidence system. The workflow deliberately does not read the launch-approval record, allowing exact-SHA staging evidence to exist before owners make final GO decisions. The guarded production release workflow reruns the proof after launch approval and before deployment.

The machine-readable launch approval must name that full reviewed candidate SHA and the complete committed migration range from the first migration through the current latest migration. Because an in-repository approval record cannot contain the SHA of its own commit, final approval is merged as a second approval-only change after the candidate proof passes. The release workflow requires the approved candidate to be a strict ancestor of the requested release SHA and permits only `config/production-launch-approval.json` and `docs/architecture/production-launch-packet.md` to differ after the candidate. It fails closed if the approval record was not changed, any runtime/workflow/migration path changed, either migration boundary is omitted, or evidence or owner decisions are incomplete. Full verification and isolated staging proof then run again on the actual release SHA before deployment.

Automatic Git deployment from `main` is disabled in `vercel.json`. Vercel's **Auto-assign Custom Production Domains** project setting must also remain disabled; the release workflow fails closed if the project API reports otherwise. Release operators must invoke the `Production Release` workflow with the full current `main` SHA and the exact confirmation `RELEASE`. Only the first manifest-bearing release also supplies the successful legacy-bootstrap run ID and `USE VERIFIED LEGACY BASELINE`; those fields must remain empty afterward. The workflow reruns all checks and the isolated staging database proof before approval, creates a non-aliased production deployment from the exact verified GitHub SHA, verifies its release manifest and signed-out browser boundary, confirms the current production target has not changed out of band, promotes that exact deployment, and repeats both checks against the canonical production URL. If a post-promotion check fails or is canceled, recovery restores the prior production deployment, confirms the project target points to the prior deployment ID, and verifies the restored browser shell. A manifest-bearing rollback also re-verifies release identity; the one-time legacy rollback uses its archived bootstrap identity plus control-plane and browser-shell checks. Rotate the Vercel token after a release or configure a short expiration.

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

After applying the reviewed migrations, set the private staging sentinel once through the Supabase SQL editor or another reviewed administrator connection, then reconnect:

```sql
insert into private.environment_sentinel (singleton, environment)
values (true, 'staging')
on conflict (singleton) do update
set environment = excluded.environment,
    configured_at = now();
```

The API URL and database URL must identify the same project. The proof refuses to continue unless the locked private row reports the `staging` sentinel, the closed RPC/table privileges are revoked for both API roles, and the content-free sentinel care event exists. It then requires successful owner authentication, server-side user validation, read-only hydration of one pre-provisioned workspace, Care Circle/Vault/sentinel-event reads, durable care-note create/read/reload through the approved RPC, API-level denial of every closed RPC and direct table mutation, revoked-user authentication with workspace/event denial, unchanged workspace records, and an intact sentinel event. Do not run it against production or the accepted Beta project.
