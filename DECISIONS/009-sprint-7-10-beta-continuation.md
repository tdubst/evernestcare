# 009: Sprint 7-10 Beta Continuation

Status: Accepted

## Context

Sprint 6 is planned as the first broader expansion lane after the Sprint 5 resource-access and provider-prep gates. The accepted Sprint 6 recommendation is Durable Care Notes, governed by `docs/architecture/sprint-6-durable-care-notes-contract.md`.

After Sprint 6, Evernest needs a clear path to beta readiness without bundling collaboration, documents, Native, and release hardening into one uncontrolled expansion.

## Decision

After Sprint 6 acceptance, Evernest will continue through Sprints 7-10 as a sequenced beta-readiness program:

1. Sprint 7: Care Circle, Invitations, and Permissions UX
2. Sprint 8: Vault / Documents Beta Slice
3. Sprint 9: Native iOS / Mobile Beta Baseline
4. Sprint 10: Beta Hardening and Release Readiness

Automatic continuation means Product Planning may start the next sprint after the prior sprint's acceptance evidence is recorded and no P0 Security/Privacy, permissions, build, or golden-flow blocker remains.

Automatic continuation does not skip review gates, broaden scope, authorize commits/deployments, or permit multiple sprint lanes to be bundled together.

## Continuation Rules

- At Sprint 6 closeout, record implemented scope, QA evidence, unresolved risks, and next-sprint authorization.
- Each sprint must follow the same loop: inspect relevant files, summarize intended changes, implement narrowly, run focused verification, and record acceptance evidence.
- If a P0 privacy, permissions, build, or golden-flow gate fails, stop continuation and switch to remediation planning.
- Keep RLS/RPC as the enforcement authority. UI permission projections remain advisory.
- QA evidence must use synthetic aliases and safe status summaries only.
- Do not move files, rename folders, delete files, commit, deploy, or alter production configuration unless explicitly asked.

## Beta Scope Boundary

Beta readiness means trustworthy family care continuity for a narrow caregiver workflow. It does not require complete feature breadth.

Provider externalization, real export/share, public links, provider portal behavior, billing, telemedicine, diagnosis, treatment guidance, emergency response, clinical decision support, and EHR replacement remain out of scope.

## Consequences

Sprint 7-10 work must be planned and accepted one sprint at a time, but the default sequence is now fixed unless Product Planning creates a later decision record.

`docs/architecture/sprint-7-10-beta-continuation.md` is the implementation and acceptance contract for the continuation program.

Detailed sprint contracts:

- `docs/architecture/sprint-7-care-circle-invitations-permissions-contract.md`
- `docs/architecture/sprint-8-vault-documents-beta-contract.md`
- `docs/architecture/sprint-9-native-ios-beta-baseline-contract.md`
- `docs/architecture/sprint-10-beta-hardening-release-readiness-contract.md`
