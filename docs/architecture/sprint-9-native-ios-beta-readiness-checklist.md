# Sprint 9 Native iOS / Mobile Beta Readiness Checklist

Status: Implementation checklist

Date: June 4, 2026

## Scope

Sprint 9 is a Native iOS / Expo beta baseline. It does not authorize new care-data writes, Apple Health, camera/document scanner, Native share sheet, push notification care details, offline PHI cache, provider externalization, public links, share/export, diagnosis, treatment guidance, or clinical decision support.

## Implemented Baseline

- `apps/mobile` remains an Expo React Native app under Evernest Family Care.
- The mobile entry screen is a safe signed-out/deferred state.
- Prototype caregiver, recipient, appointment, medication, vitals, and provider-prep details have been removed from the Native app.
- Native writes are off.
- No persistent token storage or offline care cache is introduced by this Sprint 9 proof.
- Sign-out cleanup is represented by a reachable local-session cleanup control; because no persistent mobile session/cache is introduced, cleanup is limited to in-memory beta state.
- UI copy is content-free and states that signed-in access is deferred until the reviewed native auth path is connected.

## Expo / Build Path

Required commands:

- `npm run typecheck` from `apps/mobile`
- `npx expo export --platform ios --output-dir /tmp/evernest-mobile-export` from `apps/mobile`, or equivalent Expo Go smoke if export is unavailable

Expected result:

- Typecheck passes.
- Expo bundle/export path is repeatable.
- No production deploy, EAS submit, TestFlight upload, or production config change is performed during Sprint 9 proof.

## TestFlight Plan

Before a real TestFlight build:

- Confirm Apple bundle identifier remains `care.evernest.app`.
- Confirm app name remains `Evernest Care`.
- Add EAS project credentials only through an approved Product Planning release task.
- Use internal TestFlight distribution first.
- Keep beta notes explicit that Native is a read-only/deferred baseline.
- Do not enable HealthKit, camera, document scanner, push notifications, Native share sheet, or file upload without separate Architecture/Security review.

## Permission Copy

No iOS runtime permission prompts are expected in Sprint 9.

If a future permission is added, copy must be reviewed before use and must avoid care details, diagnosis, treatment, provider delivery, or emergency-response framing.

## Privacy / Logging Stance

- No PHI, care recipient details, document metadata, raw IDs, tokens, Supabase session values, raw errors, or provider details in console output, crash logs, analytics, screenshots, QA evidence, or push text.
- No Sentry, PostHog, session replay, or push provider instrumentation is introduced by Sprint 9.
- Native proof evidence may include only statuses, visible safe copy, command pass/fail, viewport/device class, and content-free state names.

## Known Limitations

- Native auth is not connected.
- Secure token storage is not active because no native session is introduced.
- Read-only continuity uses safe deferred copy rather than live Supabase data.
- Sign-out cleanup proof is limited to local in-memory beta state.
- No native document upload, storage, download, scan, camera, share, notification, or HealthKit capability is included.

## QA Checklist

- Native app typecheck passes.
- Expo run/export path is repeatable.
- App opens to safe signed-out/deferred state.
- Sign-in status control is reachable and shows content-free guidance.
- Clear local session state control is reachable and shows cleanup confirmation.
- No hard-coded caregiver, recipient, medication, appointment, vitals, document, provider, or PHI-like examples appear.
- No native permission prompts appear.
- No horizontal overflow or clipped core controls on iPhone-class viewport/simulator.
- Console/log output contains no PHI, raw IDs, tokens, raw backend errors, or sensitive details.

## Go / No-Go

Go for Sprint 9 acceptance only if:

- Typecheck/build or Expo export path passes.
- Native safe signed-out/deferred flow passes QA.
- Security/Privacy confirms no sensitive data is logged or displayed.
- UX confirms the deferred state is clear and non-dead.
- Product Planning records Sprint 9 closeout before Sprint 10 starts.
