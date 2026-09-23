# Sprint 9 Native iOS / Mobile Beta Baseline Closeout

Status: Accepted

Acceptance date: June 4, 2026

## Scope Accepted

Sprint 9 accepts a narrow Native iOS / Expo beta baseline only:

- Safe signed-out/deferred mobile entry state.
- Read-only/deferred continuity framing.
- Content-free review sign-in status control.
- Content-free clear local beta session state control.
- Expo/iOS build and runtime smoke path for the current `apps/mobile` bundle.
- TestFlight readiness checklist for future release planning.

Sprint 9 does not accept live native auth, secure token storage, offline care cache, native writes, push, crash/analytics instrumentation, camera/scanner, Apple Health, Native share, file upload/storage, live care data, provider delivery, share/export, EAS submit, TestFlight upload, production config changes, or deployment.

## Evidence Summary

Architecture review: CLEAR.

Security/Privacy review: CLEAR.

Caregiver UX review: CLEAR.

Native iOS review: static/source/build CLEAR; runtime blocker resolved by clean Expo Go reinstall and IPv4-first Metro binding.

QA Release: PASS.

Verification evidence:

- `npm run typecheck` from `apps/mobile`: PASS with supported bundled Node.
- `git diff --check -- apps/mobile/App.tsx docs/architecture/sprint-9-native-ios-beta-readiness-checklist.md`: PASS.
- Static scan of `apps/mobile/App.tsx`: PASS for no stale prototype care/provider/person/medication/appointment/vitals/document details, storage/token/logging APIs, or sensitive instrumentation.
- Expo config inspection: PASS; app name `Evernest Care`, bundle identifier `care.evernest.app`.
- `npx expo export --platform ios --output-dir /tmp/evernest-mobile-export`: PASS with supported bundled Node; only non-sensitive color-environment warnings.
- Runtime proof: PASS on iPhone 17 simulator with Expo Go rendering the current `apps/mobile` bundle.

Runtime QA confirmed:

- Current safe deferred screen rendered.
- No stale prototype screen after clean launch.
- No native permission prompts observed.
- No prototype/care/provider/person/medication/appointment/vitals/document details visible.
- `Review sign-in status` reachable and content-free.
- `Clear local session state` reachable and content-free.
- Continuity readiness rows visible: signed-out state Ready, continuity mode Read-only, local session Clearable.
- Beta-limit copy visible: camera/scanner/native sharing/push details/Apple Health off and crash/QA evidence content-free.
- No horizontal clipping observed in the iPhone-class simulator screenshot/accessibility tree.
- No relevant runtime errors or sensitive console/Metro output while the current app was open.

## Privacy / Permissions

Sprint 9 keeps Native signed-out/deferred and content-free. No PHI-like details, care data, provider details, document metadata, raw IDs, tokens, Supabase session values, raw backend errors, share/export/provider-delivery surfaces, or native permission prompts were introduced.

The local cleanup claim is limited to in-memory beta UI state because Sprint 9 does not introduce persistent mobile session, token storage, or offline cache.

## Caveats / Beta Debt

- `apps/mobile/package.json` still declares Expo/React Native dependencies with `latest`; `package-lock.json` pins this proof, but dependency versions should be explicitly pinned before real TestFlight or release build work.
- Future live native auth, secure token storage, offline cache, push, crash/analytics instrumentation, camera/scanner, Apple Health, Native share, upload/storage, live care data, provider delivery, share/export, EAS submit, TestFlight upload, or production config changes require separate Architecture, Security/Privacy, UX, Native, and QA review.
- Runtime proof depended on clean Expo Go state and IPv4-first Metro binding. Future QA should use the same supported Node/runtime path or an approved dev-client/TestFlight artifact.

## Acceptance Decision

Sprint 9 Native iOS / Mobile Beta Baseline is accepted with no remaining P0 privacy, permissions, build, or golden-flow blocker for the accepted deferred baseline scope.

Sprint 10 may begin after Product Planning records this closeout.
