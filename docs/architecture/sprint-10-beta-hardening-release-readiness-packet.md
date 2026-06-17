# Sprint 10 Beta Hardening And Release Readiness Packet

Status: Accepted
Date: June 4, 2026

## Scope

Sprint 10 prepares the existing controlled caregiver beta surface for release review. It does not add feature breadth.

In scope:
- Golden-flow regression coverage for onboarding, care recipient setup, medications/basic history, appointments, Vault placeholders, messages deferred state, Care Circle invitations, permissions, and native deferred baseline.
- Privacy-safe monitoring policy before real beta users.
- Release notes, known limitations, rollback plan, beta tester onboarding script, and owner go/no-go packet.

Out of scope:
- Real document upload, Supabase Storage objects, signed URLs, download, preview, thumbnail, OCR, scanner/camera, Apple Health, push care details, native share sheet, provider delivery, provider portal, public/private links, real export/share, billing, EHR replacement, telemedicine, emergency response, diagnosis, treatment guidance, or clinical decision support.

## Hardening Changes

- Replaced Messages with a safe deferred beta state.
- Scrubbed Calendar prototype provider/facility/clinical/share copy into generic care coordination labels.
- Scrubbed Today prototype people/provider/clinical/share/export/visit-summary copy into internal visit-prep and category/count language.
- Scrubbed Onboarding and Profile Types prototype names, medication examples, document/share framing, and clinical profile examples.
- Scrubbed default health-event seed/projection data away from real-looking names, medications, document file names, provider labels, condition names, raw notes, and file-title projections.
- Updated lint ignores so generated output and dependency trees do not block full project lint.

## Verification Evidence

- Web full lint: PASS with six existing React Fast Refresh warnings in shared UI components only.
- Web build: PASS with existing large chunk advisory.
- Focused lint on hardened route/default-data files: PASS.
- Diff whitespace check on hardened files: PASS.
- Mobile typecheck from Sprint 9 baseline: PASS.
- Mobile iOS export from Sprint 9 baseline: PASS with non-sensitive color-env warnings only.
- Sprint 7 closeout: accepted.
- Sprint 8 closeout: accepted.
- Sprint 9 closeout: accepted.

## Golden-Flow Matrix

| Flow | Sprint 10 status | Required QA proof |
| --- | --- | --- |
| Onboarding / care recipient setup | Hardened to generic beta-safe copy | Mobile 390x844 route proof, controls reachable, no prototype examples |
| Medications / basic history | Hardened to category/status language | Today and onboarding proof with no medication name/dose leakage |
| Appointments | Hardened to generic schedule/task labels | Calendar proof with no provider/facility/share/visit-summary leakage |
| Recent Updates / durable notes | Existing accepted backend path; UI projections scrubbed | Today proof with content-free timeline/status evidence |
| Vault / documents | Sprint 8 accepted placeholder-only | Vault proof remains placeholder/category/count only |
| Messages | Deferred safe state | Messages proof: no chat/push/media/PHI, controls safe or absent |
| Invitations / permissions | Sprint 7 accepted | Care Team regression: aliases/statuses/categories only |
| Native iOS baseline | Sprint 9 accepted deferred baseline | No new native scope; preserve no permissions/no live data |

## Monitoring Policy

Beta monitoring must remain content-free until a separate Security/Privacy review clears specific tooling.

Allowed:
- Build status, route status, sanitized error class, environment alias, device class, viewport, pass/fail counts, coarse capability keys, and feature status.

Forbidden:
- PHI-like content, care notes, document content, document title, file name, storage path, signed URL, token, raw ID, email, invite marker, raw RPC response, SQL body, grant reason, provider detail, medication name/dose, vitals value, screenshot containing sensitive content, session replay, unreviewed crash/analytics payloads, push care details, or AI prompt capture.

Sentry/PostHog/session replay/crash analytics:
- Not accepted for real beta users unless configured and reviewed with content redaction, disabled replay by default, no PHI fields, no raw network bodies, no auth/session/token capture, and a written retention/access policy.

## Release Notes Draft

Evernest Care controlled beta includes:
- Family care workspace with safe status surfaces.
- Care Circle invitations and permissions using server-derived categories.
- Vault placeholder artifacts for continuity memory without file upload or content rendering.
- Internal visit-prep preview for in-app coordination only.
- Deferred Messages state.
- Native iOS signed-out/deferred baseline.

Not included:
- Real document upload/download, file preview, signed URLs, provider delivery, sharing/export, public links, native live auth, offline cache, push, camera/scanner, Apple Health, or clinical decision support.

## Known Limitations

- Vault is placeholder-first only; no file content is uploaded, shown, downloaded, or shared.
- Messages are deferred; no chat, media, delivery receipts, or push messaging.
- Native iOS remains signed-out/deferred; no live native auth, secure token storage, or care-data rendering.
- Provider/share/export flows are intentionally disabled.
- Expected negative-path RPC denial noise may appear as browser resource-load entries, but evidence must contain no raw bodies or sensitive values.
- Web build has a known large chunk advisory.
- Mobile package versions are lockfile-pinned for proof, but `latest` dependencies should be explicitly pinned before TestFlight/release work.

## Rollback Plan

- No production deploy or TestFlight upload is authorized by this packet.
- If Sprint 10 QA or owner review blocks release, hold beta access and keep the controlled environment closed.
- Web UI hardening can be reverted route-by-route if a regression is introduced.
- Previously accepted synthetic backend migrations are forward-only proof state; no production apply is implied here.
- If a live beta issue is found after controlled rollout, remove tester access, disable invitations, stop new fixture/user handoff, preserve sanitized logs only, and route Security/Privacy before reopening.

## Beta Tester Onboarding Script

1. This is a controlled caregiver beta for coordination workflows only.
2. Do not use Evernest for emergencies, diagnosis, treatment decisions, billing, telemedicine, or EHR replacement.
3. Use the reviewed beta workspace and approved test path only.
4. Do not upload real documents; Vault is placeholder-only in this beta.
5. Do not share/export content to providers from Evernest; external delivery is not enabled.
6. Report issues with the screen, step, and safe status label only. Do not include PHI, document names, medication names, tokens, IDs, URLs, screenshots with sensitive content, or raw console output.
7. Native iOS is a deferred baseline only until a later reviewed mobile auth/data sprint.

## Go / No-Go Owners

| Owner | Status |
| --- | --- |
| Product Planning | Accepted |
| Architecture | CLEAR |
| Security / Privacy | CLEAR |
| Caregiver UX | CLEAR |
| Backend Supabase | CLEAR |
| Web App | CLEAR |
| Native iOS | CLEAR |
| QA Release | PASS |

## Current Recommendation

Sprint 10 is accepted for controlled beta readiness within the limitations above. Do not expand scope into production deploy, TestFlight upload, real document upload/storage, share/export, provider delivery, native live data, or monitoring tooling without a separately reviewed contract and owner go/no-go.
