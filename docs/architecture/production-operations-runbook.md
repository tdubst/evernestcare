# Production Operations Runbook

Status: Review-ready, not accepted

## Purpose

This runbook defines the minimum operating controls for the first authenticated Evernest Care WebApp release. It does not authorize production deployment or real care data. Product, Security/Privacy, Backend, Architecture, and QA must accept the controls and complete the recorded drills before launch.

## Initial Service Boundary

- Vercel hosts the authenticated WebApp and release manifest.
- Supabase provides Auth, Postgres, RLS, and reviewed RPCs.
- GitHub Actions runs the approval-gated release workflow.
- A reviewed SMTP provider handles account recovery only.
- No analytics, session replay, third-party crash capture, real document storage, sharing/export, provider delivery, or native live data is enabled.

Maintain an owner and backup owner for Vercel, Supabase, GitHub, DNS, SMTP, security response, and user support. No launch may depend on one person's credentials.

## Availability And Recovery Targets

Initial targets for owner approval:

- Recovery point objective: at most 24 hours of durable data loss.
- Recovery time objective: restore core read access within 8 hours.
- Security revocation target: revoke a compromised user or operator credential within 1 hour of confirmation.

If the selected Supabase plan cannot meet these targets, launch is blocked until the plan or targets are explicitly changed and reviewed.

## Backup And Restore Gate

Before launch:

1. Confirm the selected Supabase plan's backup schedule, retention, point-in-time recovery availability, and region.
2. Record backup status without copying database URLs, project secrets, user identifiers, or care content into tickets or screenshots.
3. Restore the latest backup into a new isolated project with the same approved region, contractual/data-processing terms, encryption posture, and access controls as production. Restrict access to two named restore-drill operators with MFA and separate credentials.
4. Keep the restore project disconnected from every application, production domain, email provider, webhook, scheduled job, analytics/monitoring destination, and external integration. Use separate short-lived secrets and deny public onboarding.
5. Keep the restore project outside the staging allowlist. Do not set the staging sentinel, install staging fixtures, or run the mutation-capable staging verifier.
6. Through a temporary read-only administrator session, validate migration history, schema objects, constraints, RLS enablement/policies, grants, and aggregate row-count buckets. Compare content-free totals and policy names with the source backup record; do not inspect or export row payloads.
7. Confirm the restored database can start and answer metadata/readiness queries, then revoke the temporary session.
8. Destroy the restore-test project and temporary credentials immediately after evidence is accepted. A second operator must verify provider-side project deletion, credential revocation, and closure of every temporary access path. Record the deleted project reference, deletion time, and two operator-role approvals in the restricted evidence record.

Run a restore drill before launch, after a material schema/security change, and at least quarterly. Never download or retain an unencrypted production dump on a developer workstation.

## Retention, Deletion, And Account Closure

Legal and Privacy must approve exact retention periods before real care data is accepted. Until then, production onboarding remains invite-only and launch remains blocked.

The approved policy must cover:

- Active workspace data and audit-event retention.
- Closed-account grace period and irreversible deletion timing.
- Backup expiration after deletion.
- Legal preservation requests.
- Support-ticket and security-evidence retention.
- Vendor data deletion and account termination.

Account closure procedure:

1. Verify the requester through the authenticated account and a second reviewed factor; never request care details in support messages.
2. Suspend sign-in, revoke active sessions, and disable pending invitations before destructive work.
3. Identify every workspace affected by the request and require a second operator for multi-user or owner closure.
4. Execute only the versioned administrative deletion tool approved for the exact closure type. Do not run ad hoc table deletes. User-only closure must preserve a workspace that still has another active owner; sole-owner closure must transfer ownership or use the separately approved whole-workspace deletion path.
5. Record content-free audit status, operator role, policy basis, and completion time.
6. Confirm application denial immediately and backup expiration on the approved retention schedule.

Before launch, Backend and Security must approve a versioned deletion artifact and run a synthetic drill that proves:

- Preflight blocks deletion when ownership, legal hold, scope, or second-operator approval is unresolved.
- User-only closure revokes sessions, memberships, invitations, and access without deleting another member's workspace.
- Whole-workspace closure removes or lawfully retains every team/recipient-scoped row according to the approved policy, including events and audit exceptions.
- Auth deletion occurs only after application-data handling succeeds; reruns are idempotent and fail closed.
- Vendor deletion requests and backup-expiry tracking are created without copying care content.
- Post-delete sign-in, direct reads, RPC access, and recovery are denied.

Record the deletion artifact version, synthetic fixture class, result, policy exception, and backup-expiry due date in the launch packet. Production deletion remains disabled until this drill passes.

The current staging-only artifact and evidence procedure are defined in [production-account-closure-drill.md](./production-account-closure-drill.md). Static readiness is not runtime acceptance.

## Incident Response

Severity:

- P0: confirmed unauthorized access, credential disclosure, cross-workspace data exposure, destructive corruption, or production release compromise.
- P1: sustained authentication failure, unavailable core workspace, failed recovery, or high-risk privacy/control regression.
- P2: degraded non-critical workflow with no known unauthorized exposure.

For P0/P1:

1. Open a restricted incident record with time, affected service, severity, and content-free symptoms.
2. Freeze releases and preserve relevant provider logs without copying care content.
3. Contain the incident: disable the affected route or release, revoke credentials/sessions, or restore the previous verified Vercel deployment.
4. Validate workspace isolation and audit integrity using synthetic or metadata-only checks.
5. Notify Product, Security/Privacy, Backend, QA, and legal counsel. Legal determines user/regulator notification duties and timing.
6. Recover through the reviewed rollback or restore procedure, then run the full authenticated production matrix.
7. Record root cause, affected boundaries, corrective actions, and recurrence prevention before unfreezing releases.

Do not include notes, medication/vital values, document names, tokens, raw IDs, database responses, or other care content in incident systems.

The Security lead is evidence custodian. Store originals only in the approved encrypted, access-logged incident repository; restrict access to Security, legal counsel, and explicitly assigned responders. Hash or provider-lock original exports, log every access, and work from derived content-minimized copies. Apply the approved incident retention schedule, suspend destruction under legal hold, and require Security plus legal approval for final deletion. Launch is blocked until the repository, access test, integrity check, and destruction workflow are demonstrated.

## Monitoring And Alerting

Before launch, enable only content-free checks for:

- HTTPS availability and expected security headers.
- Release-manifest commit and production-mode match.
- Auth health using a synthetic account without care content.
- Database availability, connection saturation, backup status, and migration drift.
- Error-rate/status buckets without URLs containing tokens or request/response bodies.

The repository's `.github/workflows/production-health.yml` check covers public HTTPS availability, security headers, production mode, exact release SHA, and exact Vercel deployment identity every 15 minutes. It uses repository variables only and sends no credentials or care data. Keep `PRODUCTION_MONITOR_ENABLED` unset until a canonical production release exists. At launch, set it to `true` together with `PRODUCTION_HEALTHCHECK_URL`, `PRODUCTION_EXPECTED_RELEASE_SHA`, and `PRODUCTION_EXPECTED_DEPLOYMENT_ID`, then prove one successful run and one controlled failure reaches both alert owners.

Any error-monitoring vendor requires a separate Security/Privacy review of redaction, retention, access, data region, subprocessors, and deletion. Session replay remains prohibited.

Route alerts to a monitored on-call destination with one primary and one backup owner. P0 acknowledgement target is 15 minutes, P1 is 30 minutes, and P2 is the next business day. Map every alert to the severity definitions above and to one response runbook. Before launch, trigger each alert class, verify primary and backup delivery, record acknowledgement time, and confirm escalation when the primary does not acknowledge. Repeat delivery tests quarterly and after provider or routing changes.

## Credential And Access Lifecycle

- Maintain a quarterly access inventory for GitHub, Vercel, Supabase, DNS, SMTP, and the support channel. Record roles and review status, never credential values.
- Require individual operator accounts, MFA, least privilege, and a named approver. Shared daily-use accounts are prohibited.
- Keep one sealed break-glass path with hardware-backed MFA. Test access quarterly without exposing recovery material, then record pass/fail only.
- Remove a departing operator before or at separation, revoke sessions and personal tokens, and rotate any credential they could have copied.
- Use short-lived release/operator tokens wherever supported. Rotate Vercel release tokens after each release; review persistent database/admin, SMTP, DNS, GitHub, support, and recovery credentials at least quarterly and rotate them immediately after suspected exposure, offboarding, or scope reduction.
- Treat Supabase signing-key or provider-root rotation as a planned incident/change: review session invalidation, rollback, and client configuration before execution.
- After every rotation, run the relevant content-free health, Auth recovery, release, and database-boundary checks. A failed rotation check is P1.
- No credential may appear in source control, CI output, screenshots, tickets, support tools, or chat. Store secrets only in the approved provider or secret manager.

## User Support

- Publish one support contact and expected response window before onboarding users.
- State prominently that support is not monitored as an emergency service and Evernest is not an emergency-response product. Direct urgent safety needs to appropriate local emergency services without collecting details.
- Tell users not to send care details, passwords, tokens, or document content in support messages.
- Verify account ownership before discussing workspace access or changing authentication state.
- Route suspected privacy/security issues directly to the incident process.
- Assign a primary support owner and backup; define P0/P1 escalation to the on-call destination and test one synthetic escalation before launch.
- Use issue categories and status labels, not copied care content, for engineering escalation.

## Release And Rollback

- Before the first production-mode release, run `.github/workflows/bootstrap-production-baseline.yml` once from `main` with production-environment approval. It must verify the current Vercel production target, trusted project/repository identity, `main` Git ancestry, exact release-manifest deployment ID, full commit SHA, app mode, and signed-out browser shell. Record the successful workflow URL in the launch packet. This workflow does not deploy or promote; it establishes the accepted rollback baseline required by the normal release workflow.
- Release only through `.github/workflows/release-production.yml` from the exact reviewed `main` SHA.
- Require staging and production environment approvals with administrator bypass disabled.
- Keep Vercel automatic production-domain assignment disabled.
- Before promotion, the workflow corroborates the exact prior production deployment ID and commit across Vercel control-plane metadata, the trusted repository's `main` history, and the release manifest. If post-promotion verification fails, it restores that deployment and verifies the production target, restored release identity, and signed-out browser shell.
- Database migrations are forward-only. A database rollback requires a reviewed forward repair or a tested restore decision; never reverse production schema manually.

## Launch Evidence

Record launch evidence and owner decisions in [production-launch-packet.md](./production-launch-packet.md). Keep restricted evidence in the approved access-controlled system and link to it; do not copy secrets, raw identifiers, or care content into the repository.

The go/no-go packet must contain only:

- Release SHA and reviewed migration range.
- One-time production baseline bootstrap workflow URL and verified deployment identity.
- Backup/restore drill date and pass/fail.
- Restore-project destruction verification and two operator-role approvals.
- Auth recovery and credential-revocation drill pass/fail.
- Synthetic account/workspace deletion drill, artifact version, and backup-expiry tracking pass/fail.
- Alert delivery/escalation and incident-evidence custody drill pass/fail.
- Synthetic authorized, revoked, and direct-mutation proof pass/fail.
- Browser/accessibility/performance pass/fail.
- Legal/privacy policy approval status.
- Named owner-role approvals and unresolved risk decisions.

Any missing P0 evidence is a launch blocker.
