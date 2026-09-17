# Production Staging Runbook

Status: Review-ready, not executed

## Purpose

This runbook creates and proves an isolated production-like Supabase staging boundary for Evernest Care. It must never target the accepted Beta project or a production project. Passing this runbook is required before production promotion, but it does not authorize production deployment.

## Required Separation

- Use a dedicated Supabase project named `evernestcare-staging`.
- Use a dedicated GitHub `staging` environment with required reviewer approval, a `main`-only deployment rule, and administrator bypass disabled.
- Do not reuse Beta, production, or personal credentials.
- Do not place database URLs, passwords, tokens, fixture identifiers, or fixture values in source control, screenshots, logs, tickets, or test reports. Non-secret Supabase project references are intentionally stored only in the reviewed project registry as trust anchors.
- Record only content-free pass/fail labels and the reviewed migration range.

## 1. Create The Isolated Project

1. Obtain explicit approval for the Supabase organization and the reported project cost.
2. Create `evernestcare-staging` in the production region candidate.
3. Add the new staging reference to `config/production-project-registry.json` in a separately reviewed commit. The registry is the repository trust anchor: it allowlists staging and protects the accepted Beta, PokerOS, and every future production project reference. Add the production reference before any production database is used.
4. Store administrator credentials only in the approved secret manager.
5. Set the database sentinel, then reconnect before any fixture or proof command:

```sql
alter database postgres set app.environment = 'staging';
```

The fixture and verifier fail closed unless the server reports this exact value.

## 2. Apply Reviewed Migrations

1. Start from an empty project.
2. Apply every committed migration in filename order through:
   - `20260915165351_production_audit_helper_lockdown.sql`
   - `20260915172849_production_public_dml_lockdown.sql`
   - `20260915190000_production_public_schema_usage_lockdown.sql`
   - `20260917193454_production_account_closure_boundary.sql`
3. Do not edit an applied migration. Add a forward repair if review finds a defect.
4. Run database lint and Supabase security/performance advisors.
5. Stop if any migration, lint check, or security advisor reports an unresolved error.

No migration may be applied to the accepted Beta project as part of this runbook.

## 3. Configure Staging Auth

Configure through the Supabase dashboard or reviewed management API:

- Site URL: the isolated production-mode staging WebApp origin.
- Redirect allowlist: only the exact staging origin and reviewed recovery route.
- Email/password sign-in: enabled for administratively provisioned users.
- Public self-signup: disabled.
- Custom SMTP: configured and delivery tested without real care content.
- Password recovery: generic response and exact redirect verified.
- Rate limits and CAPTCHA: configured and tested.
- MFA policy: explicitly decided and recorded before launch.

Create one synthetic owner Auth account and one synthetic revoked-user Auth account administratively. Confirm both account emails and set protected app metadata `evernest_fixture=production-staging-v1` on each account before provisioning product rows. Do not create Auth users through SQL or through a public application flow. The provisioner refuses unconfirmed or unmarked Auth accounts and refuses to reactivate or rewrite altered product fixture records.

## 4. Provision The Synthetic Owner Workspace

Generate a fresh UUID for `STAGING_SENTINEL_EVENT_ID`. Export these values only in the operator shell or approved CI environment:

```text
STAGING_EXPECTED_PROJECT_REF
STAGING_OWNER_EMAIL
STAGING_PROTECTED_PROJECT_REFS
STAGING_PROVISION_DATABASE_URL
STAGING_PROVISION_CONFIRMATION=PROVISION <STAGING_EXPECTED_PROJECT_REF>
STAGING_REVOKED_EMAIL
STAGING_SENTINEL_EVENT_ID
STAGING_SUPABASE_URL
```

The database URL must include `sslmode=verify-full`; URLs with weaker TLS settings are rejected.

Run:

```text
npm run provision:staging
```

The script:

- Requires an exact operator confirmation, matching Supabase API/database project references, and the server-side `staging` sentinel.
- Requires exactly one existing Auth user for each supplied fixture email.
- Idempotently provisions one synthetic recipient and workspace, one active owner membership, one revoked membership, and a sentinel care note event.
- Emits no credentials, identifiers, row bodies, or care content.
- Does not create Auth users, apply migrations, change Auth settings, or contact a production project.

Run it a second time. Both runs must pass, and the owner must still have exactly one active membership.

## 5. Run The Authenticated Boundary Proof

Add the remaining proof values in the operator shell or GitHub `staging` environment:

```text
STAGING_SUPABASE_URL
STAGING_SUPABASE_PUBLISHABLE_KEY
STAGING_OWNER_PASSWORD
STAGING_EXPECTED_PROJECT_REF
STAGING_PROTECTED_PROJECT_REFS
STAGING_RELEASE_SHA
STAGING_REVOKED_PASSWORD
STAGING_VERIFIER_DATABASE_URL
STAGING_VERIFY_CONFIRMATION=VERIFY <STAGING_EXPECTED_PROJECT_REF>
```

Run:

```text
npm run test:staging
```

`STAGING_RELEASE_SHA` must be the full reviewed Git commit SHA. The verifier deterministically derives the proof identifier from that SHA, making reruns idempotent while preventing an older proof from certifying a different release. Recreate the isolated staging project after 25 release proofs or 90 days, whichever comes first. The verifier database URL must include `sslmode=verify-full`.

Required result: every check prints `PASS` and the command ends with `Production staging verification passed.` The proof covers protected-project denial, server-side staging identity, API/database project matching, locked table and RPC privileges, owner authentication, read-only workspace hydration, Care Circle and Vault projections, sentinel-event read, durable care-note create/read/reload through the approved RPC, direct mutation denial, Auth-UUID-bound revoked-user denial, and unchanged workspace records.

`STAGING_VERIFIER_DATABASE_URL` must use the dedicated `evernest_staging_verifier` login. It receives only connection plus usage and execute access for `staging_verification.production_staging_inspect(uuid,uuid,uuid)`. It has no access to the `public` or `auth` schemas. The staging-only inspector lives outside the API schema, has a fixed search path, returns only booleans/counts/a fingerprint, and remains revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`. Keep `STAGING_PROVISION_DATABASE_URL` local to the approved operator and never store it in GitHub Actions.

Create that role with a generated secret through a reviewed administrator session as `LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`, set `default_transaction_read_only=on`, and grant only `CONNECT` on the staging database. Do not add it to another role. PostgreSQL's inherited `TEMPORARY` database privilege is explicitly allowed for verifier-local ephemeral work; database `CREATE` and every non-system schema `CREATE` privilege are forbidden. The provisioner removes inherited `PUBLIC` access to the API schema while preserving explicit schema access for Supabase API roles. It fails if the verifier has effective access to any other non-system schema, table, sequence, or function, then grants only the isolated inspector capability. Remediate inherited project defaults through a reviewed forward migration rather than weakening the verifier. Confirm the connection passes the `least-privilege verifier role` check before saving it in GitHub.

Stop immediately if the project identity check, staging sentinel, ACL check, or owner boundary check fails.

## 6. Deploy Production-Mode Staging

Deploy a non-production, non-aliased Vercel candidate with:

```text
VITE_APP_MODE=production
VITE_REQUIRE_AUTH=true
VITE_ENABLE_DEMO_WORKSPACE=false
VITE_SUPABASE_URL=<isolated staging API URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<isolated staging publishable key>
```

Do not provide a service-role key to Vercel. Verify the release manifest identifies production app mode and the expected Git commit while the deployment remains isolated from the production domain.

## 7. Authenticated WebApp Matrix

Use synthetic values only and capture content-free results:

- Invite-only owner sign-in and server user validation.
- Authorized workspace hydration and reload stability.
- Existing care-event read and reload.
- Durable care-note create, read-back, and reload through the approved RPC.
- Care Circle membership and permission visibility.
- Vault placeholder list/read path.
- Closed invitation creation, Calendar mutation, messaging, real upload, and share/export paths.
- Revoked/non-member denial fixture and direct table mutation denial.
- Password recovery, password reset, sign-out, and post-sign-out route denial.
- 390x844 mobile, desktop Chromium, WebKit/Safari, keyboard, and accessibility smoke.
- Security headers, no sensitive console output, and no horizontal overflow.

Any P0/P1 failure blocks production promotion.

## 8. Evidence And Teardown

- Record command names, commit SHA, migration range, tester role, date, and pass/fail only.
- Never record emails, passwords, tokens, IDs, URLs containing secrets, RPC bodies, notes, or row contents.
- Remove local environment values after the run.
- Rotate temporary credentials and revoke temporary operator access.
- Keep staging available for release regression; do not promote or copy its data into production.

Production remains blocked until the full [production readiness gate](./production-readiness-gate.md) is complete and every owner records go/no-go approval.
