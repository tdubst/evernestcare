# Sprint 8 Vault / Documents Beta Slice Contract

Status: Accepted for planning

## Purpose

Sprint 8 makes Vault useful as continuity memory infrastructure, not generic cloud storage. The first proof is a narrow artifact/document beta slice with resource-scoped RLS controls, timeline attachment, and value-safe status surfaces.

## Implementation Target

- Add a narrow placeholder-first artifact model for document/photo metadata, visibility category, and optional timeline attachment.
- Enforce RLS and resource-scoped artifact access for each artifact.
- Add safe empty, loading, placeholder failure, permission denied, revoked, expired, archived, stale, and unavailable states.
- Add audit metadata allowlists for placeholder create, view, attach, revoke, denied, and unavailable outcomes if audit is introduced.

## Required Contracts And Boundaries

- Artifact access must be recipient-scoped and resource-scoped; broad team access must not imply all document access.
- Backend must not return unauthorized artifact IDs, document titles, file names, storage paths, signed URLs, content, thumbnails, or raw storage errors.
- Placeholder validation must define accepted artifact categories, metadata shape, payload size limit, and stable safe rejection statuses before implementation.
- Document content, titles, storage paths, signed URLs, and tokens are forbidden in logs, status/proof surfaces, analytics, crash output, AI prompts, and QA evidence.
- External sharing/export, public links, provider delivery, provider access, document content in Provider Prep, folder-management complexity, Native scanner/camera, and Native share sheet are out of scope.

## Sprint 8 Implementation Addendum

This addendum is the implementation target for Sprint 8. It resolves the planning ambiguity in favor of a placeholder-first proof.

### First Proof Choice

Sprint 8 first proof is placeholder-first.

Included:

- Create a value-safe artifact placeholder for the active care recipient.
- List authorized artifact placeholders in Vault.
- Optionally attach one placeholder to the operational timeline through an approved append-only event path.
- Read back / reload the authorized placeholder state exactly once.
- Prove denied, unrelated, revoked, expired, archived, stale, and explicit-deny states fail closed.

Not included:

- Binary file upload.
- Supabase Storage object creation.
- Signed URL issuance.
- File download, preview, thumbnail, OCR, scan, camera, or content rendering.
- Original file names, document titles, provider names, storage paths, bucket/path pairs, object keys, or public/private links.

If Product Planning later chooses real upload, that requires a separate storage-specific contract and proof.

### Capability Vocabulary

Use existing document capabilities for the first proof:

- `document.upload`: may create a placeholder for the active recipient through the approved server/RPC path.
- `document.view`: may list/read safe artifact placeholder projections for the active recipient.
- `document.manage`: may revoke/archive/manage placeholder access when implemented.

Rules:

- `document.upload` does not imply `document.view`.
- `document.view` does not imply `document.upload`.
- `document.manage` is separate from upload/view.
- Broad team membership does not imply artifact access.
- Broad `care_event.view` must not hydrate artifact placeholder payloads unless `document.view` is allowed for the active recipient/resource boundary.

### Backend RPC / Projection Contracts

Backend should implement RPCs or equivalent server-derived projections with these safe product shapes:

- `get_vault_artifact_summary`
- `create_vault_artifact_placeholder`
- `list_vault_artifacts`
- `attach_vault_artifact_to_timeline`
- `revoke_vault_artifact_access` if manage/revoke is included in the first proof
- `get_artifact_access_advisory_summary` if WebApp needs category-level advisory copy beyond existing permission context

Inputs must be limited to active boundary context plus closed enum fields. Do not accept or return document title, original file name, storage path, signed URL, content, thumbnail, provider name, care label, raw ID, grant reason, or raw storage/backend error.

Safe client result fields:

- `status`
- `result`
- `artifact_alias`
- `artifact_category`
- `visibility_category`
- `attachment_status`
- `capability_keys`
- `count`
- `created_time_bucket`
- `permission_version`

Allowed statuses:

- `ready`
- `created`
- `attached`
- `revoked`
- `empty`
- `denied`
- `access_changed`
- `boundary_unavailable`
- `stale_permission_context`
- `unsupported_artifact_type`
- `invalid_request`
- `unavailable`
- `duplicate_request`

Non-ready or denied responses must return null aliases/categories where applicable, empty arrays, and no hidden resource detail.

### Placeholder Metadata

Accepted artifact categories:

- `care_document`
- `medication_photo`
- `insurance_card`
- `referral`
- `instructions`
- `other`

Accepted visibility categories:

- `family_visible`
- `private`

First proof limits:

- No user-supplied document title.
- No original file name.
- No provider/facility name.
- No free-text description.
- No document content.
- No thumbnail or image preview.
- Maximum serialized placeholder payload: 4 KB.
- Metadata must use closed enum values only.

Malformed, unsupported, oversized, empty, or mismatched requests must fail closed with stable safe statuses and no payload echo.

### Timeline Attachment

If timeline attachment is included, use an append-only `CareArtifactAttachedEvent` or successor event through the approved care-event authority.

Attachment payload must be value-safe:

- artifact alias or server-derived opaque placeholder reference for internal use only
- artifact category
- visibility category
- attachment status
- schema version
- operational context `care-artifact-placeholder`

The event must not expose document title, original file name, provider name, storage path, signed URL, bucket/path pair, content, thumbnail, raw document ID, or raw storage error in UI/status/proof/audit surfaces.

Provider Prep, share/export, provider summary, continuity signals, status/proof/access cards, and QA evidence must remain artifact-content-free for this proof. If Today/Recent Updates shows an attached artifact row, it may show only a category/status label such as `Care document added` or `Artifact linked`, never a title or file name.

### Audit Allowlist

If audit is introduced or changed, allowed action keys are limited to:

- `vault_artifact_placeholder_created`
- `vault_artifact_placeholder_viewed`
- `vault_artifact_placeholder_attached`
- `vault_artifact_placeholder_revoked`
- `vault_artifact_placeholder_denied`
- `vault_artifact_placeholder_unavailable`

Allowed metadata keys:

- `status`
- `result`
- `resource_class`
- `artifact_category`
- `visibility_category`
- `capability_key`
- `attachment_status`
- `schema_version`
- `count`

Forbidden in audit metadata, logs, UI status, analytics, crash/session replay, AI prompts, and QA evidence:

- document title
- original file name
- provider/facility name
- storage bucket
- storage path
- bucket/path pair
- object key
- signed URL
- token
- content
- thumbnail
- raw document/artifact/user/team/recipient/grant IDs
- raw grants
- grant reasons
- raw storage/RPC/SQL errors
- unauthorized resource details
- provider/share/export/public-link metadata
- PHI-like content

### Direct Access Stance

Sprint 8 WebApp product surfaces must use approved RPC/projection paths only.

Direct client table/storage paths are not accepted as the product proof path. Backend/QA must prove either denial where applicable or explicit non-use plus RLS posture. Because first proof is placeholder-first, no storage-object access proof is claimed unless Product Planning separately adds real upload scope.

### WebApp No-Go Copy And Surfaces

Current prototype Vault content must be removed or gated before Sprint 8 acceptance. Sprint 8 UI must not render:

- real-looking document titles or file names
- provider/facility names
- imaging/lab interpretation examples
- `Share with care team`
- `Private until shared`
- `Document sharing`
- `Included in visit summary`
- `Share window`
- `Access ends after visit`
- `Attach to visit prep`
- `Search documents, providers, labs`
- provider-written summaries
- provider-recommended follow-up
- `stable`, `normal`, `no follow-up needed`, or clinical interpretation copy
- native scan/camera/share actions

Safe first-proof copy:

- `Vault`
- `Continuity memory for care documents and photos.`
- `Add artifact`
- `Add document placeholder`
- `Saved to the active care workspace when access is available.`
- `Attached to the care timeline when saved.`
- `No artifacts yet`
- `Checking Vault access.`
- `Adding artifact.`
- `Artifact added.`
- `Linked to care timeline.`
- `Vault access is not available for this workspace.`
- `Access changed. Vault details are unavailable.`
- `Vault is unavailable. Try again later.`

## UX Requirements

- Vault should present artifacts as continuity context, not as a generic cloud drive.
- User-facing states must make visibility and unavailable/denied states clear without exposing hidden resource details.
- Mobile `390x844` proof must cover placeholder states, denied states, wrapping/truncation, reachable controls, and no horizontal overflow.

## QA Acceptance

- Placeholder artifact golden flow passes through the approved server path. Real upload/storage proof is deferred unless separately contracted.
- Artifact read passes for authorized user and is denied for unrelated, revoked, expired, archived, stale, and explicit-deny users.
- Placeholder failure and oversized/unsupported inputs return stable safe statuses without raw errors or payload echo.
- Direct unauthorized table access remains denied where applicable. Storage-object denial is required only if Product Planning separately adds real upload scope.
- Audit metadata excludes document content, titles, file names, storage paths, tokens, raw errors, and unauthorized resource details.
- Provider Prep/share/export/provider-delivery no-artifact assertions pass.
- Build/lint/focused checks and mobile `390x844` console-clean proof are recorded.

## Continuation Gate

Sprint 9 may start only after Sprint 8 records acceptance evidence and has no P0 Security/Privacy, permissions, build, storage, or golden-flow blocker.
