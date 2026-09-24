# Evernest Care Production Launch Packet

Status: Not approved

This packet is the authoritative go/no-go record for the first authenticated Evernest Care WebApp release. A preview, successful build, merged pull request, or Vercel production deployment does not by itself authorize launch or real care data.

The machine-readable approval record is `config/production-launch-approval.json`. Keep it `not_approved` with pending entries until the corresponding evidence and owner decisions exist. Evidence references use content-free `restricted:<record>` identifiers that resolve only inside the approved evidence system. The production release workflow independently rejects an incomplete record.

## Release Identity

| Field | Required evidence | Status |
| --- | --- | --- |
| Release SHA | Full reviewed `main` commit SHA | Pending |
| Release version | Package and release-manifest version | `0.1.0` |
| Canonical HTTPS origin | Vercel-owned production origin | `https://evernestcare.vercel.app` |
| Reviewed migration range | First and last migration filenames applied to staging and production | Pending |
| Initial product boundary | Invite-only authenticated WebApp; read-only hydration; durable care notes; Care Circle visibility; Vault placeholders | Defined |
| Excluded scope | Calendar mutation, messaging, self-service onboarding, invitation delivery, medication/check-in writes, real files, sharing/export, native live data, third-party monitoring | Enforced in source; runtime proof pending |

## Required Evidence

Every row must be `PASS` or `APPROVED` before production promotion. Links must point to restricted, content-free evidence. Do not paste credentials, raw identifiers, care content, database output, request bodies, or provider secrets into this file.

The authenticated isolated-staging command last passed locally on September 24, 2026 for commit `ea67231`, including the direct mutation matrix and the owner/revoked/unrelated-ID helper-oracle matrix. The exact-SHA production-mode candidate also passed hosted owner sign-in, cross-browser sign-out, and post-sign-out protected-route denial. The verifier binds each run to the supplied full release SHA, so the final reviewed `main` SHA must pass again before promotion. The corresponding rows below intentionally remain `Pending` until the final result is archived under valid `restricted:` evidence references and the named owners accept it. A local or preview pass is not release approval. Architecture, Backend, Security/Privacy, and QA accept the exact 19-function authenticated `SECURITY DEFINER` allowlist as a bounded initial-release exception. The staging organization is currently on the Free plan, so leaked password protection remains a separate unresolved P0 production gate that requires a paid-plan decision.

| Gate | Required evidence | Owner role | Status |
| --- | --- | --- | --- |
| Pull-request quality | Required GitHub checks on the reviewed SHA | Engineering | Pending |
| Architecture review | Production boundary and release design approval | Architecture | Pending |
| Security/privacy review | Auth, permissions, RLS, logging, deletion, and incident controls approval | Security/Privacy | Pending |
| Backend review | Ordered migrations, grants, RLS, RPCs, and direct-mutation denial approval | Backend | Pending |
| UX review | Signed-out, sign-in, recovery, empty, loading, denied, and error states | UX | Pending |
| Isolated staging proof | `npm run test:staging` for the release SHA | Backend + QA | Pending |
| Auth recovery drill | Invite-only sign-in, generic recovery, reset, sign-out, and revoked-user denial | QA + Security | Pending |
| Authenticated browser matrix | Authorized and revoked synthetic users across the initial production scope | QA | Pending |
| Database advisors | Security and performance advisors reviewed after migration | Backend + Security | Pending |
| Direct mutation matrix | Closed RPC and table writes denied for API roles | Backend + Security | Pending |
| Backup/restore drill | Isolated restore, metadata validation, and verified destruction | Operations + Backend | Pending |
| Account closure drill | Approved artifact, two-operator authorization, Auth denial, and backup-expiry tracking | Backend + Security | Pending |
| Credential revocation drill | User and operator revocation within the target window | Security + Operations | Pending |
| Incident evidence drill | Restricted repository, integrity check, access test, and destruction workflow | Security + Legal | Pending |
| Alert delivery drill | Scheduled release-identity check plus Auth, database, and backup alerts reach primary and backup | Operations | Pending |
| Accessibility/cross-browser | Mobile accessibility, supported browsers, responsive layout, and no P0/P1 findings | QA | Pending |
| Performance | Accepted route-load and bundle measurements on the production candidate | QA + WebApp | Pending |
| Privacy Policy and Terms | Counsel-approved public documents and effective dates | Legal | Pending |
| Consent and retention | Counsel-approved consent, retention, deletion, and legal-hold policy | Legal + Privacy | Pending |
| HIPAA/vendor review | Applicability decision, vendor list, subprocessors, and required BAAs/DPAs | Legal + Security | Pending |
| Support readiness | Public contact, response targets, escalation, and non-emergency language | Product + Operations | Pending |
| Production baseline | Successful one-time legacy bootstrap workflow, archived exact deployment identity, and verified rollback shell | Release | Pending |
| Production environment | GitHub and Vercel settings independently checked against the runbook | Release + Security | Pending |

## Owner Decision

Each owner records `GO` only after reviewing the evidence above. Conditional approval is a `NO-GO` until the condition is resolved and re-reviewed.

| Owner role | Decision | Evidence reference | Date |
| --- | --- | --- | --- |
| Product | Pending | Pending | Pending |
| Architecture | Pending | Pending | Pending |
| Backend | Pending | Pending | Pending |
| WebApp | Pending | Pending | Pending |
| Security/Privacy | Pending | Pending | Pending |
| UX | Pending | Pending | Pending |
| QA/Release | Pending | Pending | Pending |
| Legal | Pending | Pending | Pending |
| Operations | Pending | Pending | Pending |

## Promotion Record

Complete only after every required row and owner decision is accepted.

| Field | Value |
| --- | --- |
| Production release workflow URL | Pending |
| Vercel deployment ID | Pending |
| Canonical HTTPS origin | Pending |
| Release manifest SHA verified | Pending |
| Signed-out browser boundary verified | Pending |
| Promotion time | Pending |
| Release operator role | Pending |
| Rollback deployment ID verified | Pending |

## Launch Rule

Production promotion is prohibited while this packet says `Not approved`, any required evidence is pending or failed, any owner decision is not `GO`, or any P0/P1 issue remains open. After promotion, attach the workflow evidence and change the packet status only through a reviewed commit.

Operational procedures are defined in [production-operations-runbook.md](./production-operations-runbook.md). Staging proof is defined in [production-staging-runbook.md](./production-staging-runbook.md). The release boundary and P0 gates are defined in [production-readiness-gate.md](./production-readiness-gate.md).
