# Sprint 10 Beta Hardening / Release Readiness Closeout

Status: Accepted

Acceptance date: June 5, 2026

Product Planning owner: EFC - Product Planning

## Accepted Scope

Sprint 10 accepts beta hardening and release-readiness review for the existing controlled caregiver beta surface.

Completed:

- Messages route is a safe deferred state with no chat, media, push, delivery, or PHI-like content.
- Today medication, vitals, care prep, care-note, and recent-update surfaces are content-free for beta proof.
- Calendar appointment surfaces use generic coordination/status copy without provider/facility/share/export framing.
- Onboarding and Profile Types use broad beta-safe setup copy without prototype names, medication examples, document file-name framing, or clinical profile examples.
- Default health-event seed/projection data is scrubbed away from real-looking names, medication/dose examples, vitals values, document file names/titles, provider labels, raw notes, and content-bearing profile details.
- Sprint 7 Care Circle / invitations / permissions accepted surfaces remain preserved.
- Sprint 8 Vault remains placeholder-first only.
- Sprint 9 Native iOS remains signed-out/deferred with no new native scope.
- Release packet records monitoring policy, beta limitations, rollback plan, tester onboarding guidance, and owner go/no-go status.

Deferred:

- Real document upload, Supabase Storage objects, signed URLs, download, preview, thumbnails, OCR, scanner/camera, or file content rendering.
- Real share/export, public/private links, provider delivery, provider portal, provider access, or external document workflows.
- Native live auth, secure token storage, offline cache, push, crash/analytics instrumentation, camera/scanner, Apple Health, Native share, upload/storage, live care data, EAS submit, or TestFlight upload.
- Production deploy, production config changes, beta monitoring tools, session replay, crash analytics, or telemetry beyond the content-free policy.

Explicitly out of scope:

- Diagnosis, treatment guidance, clinical decision support, EHR replacement, telemedicine, billing, emergency response, public links, real export/share, or external provider access.

## Affected Golden Flows

- Onboarding and profile setup: broad, beta-safe copy with reachable controls.
- Today: medication/status history, vitals/status summaries, care prep overview, recent updates, and care-note composer.
- Calendar: appointment detail/add states and notice-only coordination controls.
- Messages: deferred state.
- Vault: accepted Sprint 8 placeholder-only surface.
- Care Team: accepted Sprint 7 Care Circle, invitations, and advisory permissions surface.
- Native iOS: accepted Sprint 9 signed-out/deferred baseline with no new native capability.

## Privacy And Permissions Impact

- Sprint 10 adds no new backend, RLS, RPC, storage, auth, fixture, production config, deploy, or native permission surface.
- QA evidence remains content-free: route/status/pass-fail/viewport/console classifications only.
- User-visible surfaces and evidence exclude medication names, doses, reminder times, frequency values, vitals numeric values, chart readings, note examples, document titles, file names, storage paths, bucket/path pairs, signed URLs, tokens, raw IDs, raw RPC bodies, backend metadata, provider/facility/person examples, provider delivery, share/export/public-link/visit-summary wording, diagnosis/treatment claims, emergency/EHR/billing claims, and PHI-like content.
- Monitoring policy forbids PHI-like telemetry, raw network bodies, session replay, unreviewed crash/analytics payloads, AI prompt capture, and screenshots/logs containing sensitive content.

## Owner Review Summary

- Architecture: CLEAR.
- Backend Supabase: CLEAR; no new backend/Supabase proof required for Sprint 10 because no backend changes were introduced.
- Web App: CLEAR after final content-free copy patch.
- Native iOS: CLEAR using Sprint 9 accepted native proof plus no-new-native-scope confirmation.
- Caregiver UX: CLEAR.
- Security/Privacy: CLEAR after final Today copy repair and targeted no-go scan.
- QA Release: PASS after narrowed formal 390x844 rerun.

## Verification Evidence

- `npm run lint`: PASS with six existing React Fast Refresh warnings in shared UI components only.
- `npm run lint -- --quiet`: PASS.
- `npm run build`: PASS with existing large chunk advisory.
- Focused eslint on Sprint 10 hardening files: PASS.
- `git diff --check` on Sprint 10 packet/hardening files: PASS.
- Security no-go source scans after final repairs: PASS.
- Broad quoted-string no-go scan over repaired runtime files: PASS.
- Supplemental 390x844 route smoke on `/today`, `/calendar`, `/messages`, `/vault`, `/care-team`, `/onboarding`, and `/profile-types`: PASS, all routes rendered, no horizontal overflow, forbidden DOM scan zero hits.

Formal QA rerun:

- Runtime: local WebApp at `390x844` with alternate ephemeral headless Chrome/CDP runner after in-app Browser timeout.
- `/today` Vitals quick action: PASS; no previous vitals/device no-go strings, no horizontal overflow, no sensitive console output.
- `/today` Care prep overview: PASS; no diagnosis/treatment wording, `Internal visit preview` absent, `Care prep overview` present, no horizontal overflow, no sensitive console output.
- `/calendar` Add appointment sheet: PASS; no external sharing/share/export wording, no horizontal overflow, no sensitive console output.
- `/onboarding` continuity step: PASS; no file-name or sharing wording, no horizontal overflow, no sensitive console output.
- Seven-route quick scan: `/today`, `/calendar`, `/messages`, `/vault`, `/care-team`, `/onboarding`, and `/profile-types` rendered at 390px with no horizontal overflow, no no-go copy, and no sensitive console output.

## Risks Or Blockers

P0 blockers: None.

Residual risks:

- Unsigned `/vault` and `/care-team` local route states still emit content-free unavailable/auth-route console noise. No sensitive values were observed. This matches prior accepted caveat class.
- Web build still has a known large chunk advisory. Track as beta hardening, not Sprint 10 acceptance.
- Mobile package dependencies remain lockfile-pinned for proof while `apps/mobile/package.json` still uses `latest`; pin explicit versions before real TestFlight/release work.
- Sprint 10 acceptance does not imply approval for production deploy, real beta monitoring tools, live native data, real document upload/storage, share/export, provider delivery, or external access.

Follow-up debt:

- Consider transport normalization if Product Planning later requires zero browser resource-load entries for expected unauthenticated or denied local route states.
- Pin mobile package versions before TestFlight/release build work.
- Keep all live analytics/crash/session replay tooling blocked until Security/Privacy approves redaction, retention, and access policy.
- Keep real upload/storage/share/export/provider delivery out of scope until separately contracted and proven.

## Acceptance Decision

Sprint 10 Beta Hardening / Release Readiness is accepted for controlled beta readiness review.

No P0 privacy, permissions, build, mobile, monitoring, golden-flow, WebApp, Backend, Native, UX, Security/Privacy, Architecture, or QA runtime blocker remains for the accepted scope.

Controlled beta may proceed only within the accepted limitations and without production deploy, TestFlight upload, real upload/storage, share/export, provider delivery, native live data, or monitoring expansion unless separately authorized.
