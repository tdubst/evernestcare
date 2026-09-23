# Sprint 8 Vault / Documents Beta Slice Closeout

Status: Accepted

Acceptance date: June 4, 2026

Product Planning owner: EFC - Product Planning

## Implemented Scope

Completed:

- Vault route now uses server-derived RPC/projection surfaces instead of prototype document/provider examples.
- Placeholder-first Vault proof is implemented with no binary upload, Supabase Storage object, signed URL, download, preview, thumbnail, OCR, scanner/camera, or content rendering.
- Safe artifact placeholders can be created, listed, read back after reload, and linked to the care timeline through approved Sprint 8 RPCs.
- Artifact access advisory renders category-level `document.view`, `document.upload`, and `document.manage` capability labels without becoming enforcement authority.
- Artifact aliases are held only as internal client correlation material for RPC actions and React keys; they are not rendered or recorded in evidence.
- Backend document/artifact visibility preserves `document.view` separation, broad `care_event.view` cannot hydrate artifact placeholder events, and restricted non-placeholder documents stay hidden without active explicit document grants.
- Placeholder document and care-event audit metadata is allowlisted to value-safe status/category/result/schema fields.
- WebApp product path does not directly read or write documents, care events, users, roles, grants, or storage objects.

Deferred:

- Real binary upload and Supabase Storage bucket/object policy proof.
- Signed URL issuance, download, preview, thumbnails, OCR, scanner/camera, Native share sheet, or document content rendering.
- Provider Prep document content, provider delivery, provider access, public/private links, share/export, or external document workflows.
- Folder management, document title/file-name display, provider/facility labels, and free-text artifact metadata.

Explicitly out of scope:

- Diagnosis, treatment guidance, clinical decision support, EHR replacement, telemedicine, billing, emergency response, public links, real share/export, or external provider access.

## Affected Golden Flows

- Vault placeholder flow: active authenticated boundary, advisory document capability summary, create placeholder, list/read-back, reload preservation, and optional timeline link.
- Permissions management: `document.upload`, `document.view`, and `document.manage` remain separate capability surfaces.
- Care timeline read-back: artifact events require matching placeholder document visibility; broad `care_event.view` alone is not enough.
- Denied/unrelated/revoked/expired/archived/stale states fail closed without artifact detail echo.

## Privacy And Permissions Impact

- RLS/RPC remains enforcement authority.
- Product surfaces use approved RPC/projection results only.
- Client-visible fields are limited to status/result, artifact category, visibility category, attachment status, capability keys, value-safe counts, time buckets, and permission version.
- UI, logs, audit metadata, and QA evidence exclude document titles, original file names, provider/facility names, storage bucket/path pairs, object keys, signed URLs, tokens, raw document/artifact/user/team/recipient/grant IDs, raw grants, grant reasons, raw RPC/SQL/storage errors, content, thumbnails, provider/share/export metadata, and PHI-like content.
- Direct authenticated document insert/update/delete posture is denied for product proof.
- No storage object activity is part of Sprint 8 acceptance.

## QA Evidence Summary

- Backend synthetic metadata matrix: PASS.
- Backend owner create/list/attach/read-back: PASS.
- Upload-without-view separation: PASS; create/attach allowed where intended, artifact event/read-back hidden without `document.view`.
- Broad `care_event.view` without `document.view`: PASS; ordinary care event remains visible, artifact event hidden, note event remains gated.
- Restricted non-placeholder document regression check: PASS; hidden without active explicit document grant, visible with active explicit grant, hidden after revoked/non-active membership.
- Direct authenticated document DML posture: denied.
- Audit allowlist scan: PASS; no provider/share/export action keys.
- Storage object activity: zero.
- WebApp focused lint: PASS.
- WebApp `git diff --check`: PASS.
- WebApp build: PASS with existing non-sensitive large chunk advisory.
- Security/Privacy WebApp review: CLEAR.
- Caregiver UX review: CLEAR.
- Signed-in mobile WebApp proof at `390x844`: PASS with expected negative-path console caveat.
- Authorized `vault_uploader_viewer` load, access advisory, add-placeholder sheet, create, list/read-back, reload preservation, and timeline link: PASS.
- Missing-upload path: PASS; Add artifact unavailable and no mutation path exposed.
- Unrelated path: PASS; fail-closed/unavailable with no artifact details.
- Provider/share/export/storage/upload/title/file/path no-go scan: PASS.
- Mobile/accessibility smoke: PASS; no horizontal overflow, reachable close/cancel controls, status text present.

## Risks Or Blockers

P0 blockers: None.

Residual risks:

- The unrelated negative WebApp path produced browser resource-load console entries for expected denied RPC calls with status class `400`. No raw response body, IDs, paths, tokens, or sensitive values were included in evidence. Track as beta hardening if Product Planning later requires strict zero browser network-error entries for expected denial paths.
- Build has a known large chunk warning; track as beta hardening, not Sprint 8 acceptance.
- The authorized synthetic fixture now has created/linked placeholder residue from WebApp proof. Future create-from-empty proof requires fixture reset or a new synthetic alias.
- Sprint 8 is placeholder-only. Real file upload/storage/download/preview remains unproven and must not be inferred from this closeout.

Follow-up debt:

- Keep Provider Prep/share/export/public-link/provider access out of Vault until separately contracted.
- Preserve artifact-content-free Today/Provider Prep/status/proof surfaces.
- Consider normalizing denied RPC transport if strict console-clean negative paths become a beta gate.
- Revisit storage, signed URL, document audit, and object cleanup contracts before any real upload slice.

## Continuation Decision

Next sprint: Sprint 9 Native iOS / Mobile Beta Baseline.

Authorized to continue automatically: Yes.

Reason: Sprint 8 acceptance evidence is recorded and no P0 Security/Privacy, permissions, build, storage, golden-flow, audit, Backend, WebApp, or QA runtime blocker remains.

Required remediation before continuation: None.
