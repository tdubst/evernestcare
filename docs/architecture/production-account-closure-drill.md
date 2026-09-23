# Production Account Closure Drill

Status: static-ready for an isolated synthetic staging drill; runtime unverified; not approved for real-user deletion

## Boundary

This drill proves fail-closed account closure without changing production, Beta, or shared user data. It supports:

- `user_only`: close one synthetic user after confirming every shared workspace retains another active owner.
- `sole_owner_team`: also close a workspace only when the target is its sole active member and its recipient has no other active workspace.

It blocks unregistered projects, protected or production projects, incomplete protected-project declarations, wrong database roles, non-verified TLS, mismatched confirmations, missing or duplicate operator approvals, unresolved legal holds, expired approvals, ambiguous fixtures, ownership-transfer gaps, non-placeholder documents, Storage ownership, and direct table access.

## Operator Boundary

Migration `20260917193454_production_account_closure_boundary.sql` creates the exact login role `evernest_account_closure_operator` with `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`, and `NOINHERIT`. It clears the role password and removes all role memberships.

The operator receives only:

- database `CONNECT`;
- `USAGE` on the private schema;
- `EXECUTE` on `private.close_synthetic_staging_account(uuid, uuid, text)`;
- `EXECUTE` on `private.verify_synthetic_staging_account_closure(uuid, uuid, text)`.

It receives no database or schema `CREATE`, table, sequence, unrelated function, public, Auth, or Storage privileges. PostgreSQL's inherited `TEMPORARY` database privilege is explicitly allowed, matching the staging verifier boundary; the operator receives no direct `TEMPORARY` grant. The private functions are `SECURITY DEFINER`, owned by the trusted migration owner, use an empty search path, disable row security only inside their reviewed bodies, verify the caller's exact role posture, and refuse non-staging execution. PostgreSQL 17 on managed Supabase records one platform-created `supabase_admin` grant of the operator role to `postgres`; the posture check permits it only with `ADMIN`, `NOINHERIT`, and `SET FALSE`. No other inbound or outbound membership is allowed.

A trusted database administrator must provision a unique temporary password for the operator after the migration. Deliver it through the approved secret channel and clear or rotate it immediately after the drill. Do not put it in source control, shell history, CI variables with broad readership, screenshots, or evidence.

The closure operator cannot authorize its own run. Before execution, a trusted administrator must create one row in `private.account_closure_authorizations` for the exact application user, one-way Auth ID hash, and closure mode. The record must contain distinct requester and second-operator Auth user IDs, `legal_hold_status = 'clear'`, a short expiry, and no consumption timestamp. The requester and approver must be unbanned, active, email-confirmed Auth users with verified MFA factors and protected app-metadata roles `closure_requester` and `closure_approver`. The closure function validates those identities, locks the record, and consumes it in the same transaction as application-data closure. The operator has no table privilege on the authorization record.

## Data Handling

Application authorization and mutable account data are closed inside one database transaction before Auth deletion. This immediately removes the application's active user and membership boundary for an already-issued JWT. The executor then hard-deletes the Auth user through `auth.admin.deleteUser()`. Auth deletion remains outside SQL and after application closure. Existing access JWTs can remain cryptographically valid until expiry, but the closed application boundary must deny them.

Mutable personal data is removed or redacted. Immutable `care_events` and append-only `audit_events` are explicit retention exceptions. The drill keeps pseudonymous user, team, and recipient shells where retained records require them. This synthetic drill does not establish a lawful real-data retention period.

The migration changes `public.users.auth_user_id` to nullable `ON DELETE SET NULL`. Active, invited, and suspended users must still have an Auth identity; only a deleted application user may have no Auth identity. A private receipt retains a one-way hash of the former Auth ID, closure mode, timestamp, and retained-record counts so an interrupted Auth deletion can be retried without storing or printing the Auth ID.

## Preconditions

1. Register the isolated target in `stagingProjectRefs` in `config/production-project-registry.json` through separate review. It must not appear in `protectedProjectRefs` or `productionProjectRefs`.
2. Keep every protected and production project in the same registry. Supply the complete union to the executor; omission blocks execution.
3. Confirm the locked `private.environment_sentinel` row reports `staging` in the target database.
4. Apply migrations through `20260923220633_production_policy_and_fk_index_hardening.sql` as the trusted migration owner. This includes the private staging sentinel and the forward repair that validates the exact managed PostgreSQL 17 role-creator relationship without granting the closure operator any inherited or settable role access.
5. Provision a temporary password for the exact `evernest_account_closure_operator` login. Do not alter its attributes, memberships, or grants.
6. Use a synthetic Auth user marked in protected app metadata with `evernest_fixture=production-staging-v1`.
7. Confirm the target owns no Storage objects and no non-placeholder document rows. The private closure function independently enforces both conditions.
8. Have a separate trusted administrator record the time-limited authorization described above only after both MFA-backed operators confirm scope and Legal/Privacy confirms no hold. Do not expose the operator identities or target IDs in evidence.
9. Take and record a pre-drill backup or PITR restore point using content-free evidence only.

## Execute

Provide these values only in the approved operator shell:

```text
ACCOUNT_CLOSURE_APP_USER_ID
ACCOUNT_CLOSURE_AUTH_USER_ID
ACCOUNT_CLOSURE_CONFIRMATION=CLOSE <PROJECT_REF> <APP_USER_ID>
ACCOUNT_CLOSURE_DATABASE_URL=postgresql://evernest_account_closure_operator:<SECRET>@<HOST>/postgres?sslmode=verify-full
ACCOUNT_CLOSURE_EXPECTED_PROJECT_REF
ACCOUNT_CLOSURE_MODE=user_only|sole_owner_team
ACCOUNT_CLOSURE_PROTECTED_PROJECT_REFS=<complete comma-separated protected and production refs>
ACCOUNT_CLOSURE_SUPABASE_SECRET_KEY
ACCOUNT_CLOSURE_SUPABASE_URL
```

The direct database username must be exactly `evernest_account_closure_operator`. A Supabase pooler username must be exactly `evernest_account_closure_operator.<PROJECT_REF>`. The executor and PostgreSQL client both require certificate and hostname verification through `sslmode=verify-full`.

Run:

```text
node scripts/account-closure/close-synthetic-staging-account.mjs
```

The executor calls only the two private functions. It does not read or mutate product tables directly. After the first function reports that application closure is complete, it deletes the Auth user with the server-only Admin API and calls the verification function.

Run the same command again. It must return the same PASS result without creating, restoring, or changing any product row. Then clear or rotate the temporary operator password.

## Required Evidence

Record only:

- reviewed commit and migration range;
- registered staging target and complete protected-project declaration confirmed;
- exact operator posture and verify-full TLS confirmed;
- distinct requester and second-operator approval PASS;
- legal-hold clearance and authorization consumption PASS;
- closure mode;
- application access removal PASS;
- mutable-data closure PASS;
- Auth deletion PASS;
- immutable event/audit exception count buckets;
- second-run idempotency PASS;
- post-closure sign-in and refresh denial PASS;
- pre-closure backup/PITR point recorded;
- backup expiry PENDING or PASS.

Do not record emails, UUIDs, credentials, URLs containing secrets, row bodies, notes, event payloads, invitation values, or care content.

## Backup Expiry

Database closure does not erase historical backups immediately. Keep the closure open until the earliest available restore point is later than the closure time, or every backup containing the fixture has expired under the approved plan retention window. Record a content-free PASS with the observed retention class and date. Never claim irreversible deletion while a qualifying backup remains restorable.

Storage is not covered by this database drill and is deliberately blocked. A future real-upload deletion procedure must separately delete Storage objects and verify their retention behavior before Auth deletion.

## Direct SQL Risk

Do not reproduce the private functions as ad hoc SQL and do not give the operator table access. The ordering, staging sentinel, synthetic fixture marker, role-posture check, protected-project registry, confirmation binding, advisory lock, ownership rules, and Auth postcondition are required controls. Direct deletion of `auth.users` is prohibited; use the reviewed Admin API so Auth sessions and identities follow the supported deletion path.

## Production Gate

This drill is not authority to delete real accounts. Before real-user closure, Legal/Privacy must approve retention and exception periods, Security must approve operator authorization and session-expiry controls, Operations must prove backup expiry, and QA must prove user-only, transferred-owner, sole-owner, idempotent retry, denied-authorization, unregistered-project, protected-project, and altered-role cases in production-like staging.
