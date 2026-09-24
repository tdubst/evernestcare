# Sprint 5 Resource Access and Provider Prep Contract

Status: Accepted

## Purpose

Sprint 5 defines contract-ready permissions and provider-prep gates before any broad feature expansion.

This contract is the implementation target for the first narrow Sprint 5 candidate:

```text
authenticated active boundary -> resource-scoped access projection -> optional in-app provider-prep preview -> no external delivery
```

It does not authorize provider sharing/export, public links, documents/messages product flows, invitations, durable care notes, Native work, provider portal behavior, or persisted profile labels.

## Source Decisions

- `DECISIONS/003-permissions-philosophy.md`
- `DECISIONS/008-resource-scoped-permissions-and-provider-prep-gates.md`
- `docs/architecture/sprint-3-hardening-contracts.md`

## Backend Contract: `hydrate_resource_access_context`

### Authority

The projection is advisory. RLS/RPC remains the enforcement authority for every read, write, preview, share, export, invitation, document, message, note, and provider-prep action.

The RPC must derive actor, app user, active membership, active care team, active care recipient, role defaults, explicit grants, explicit denies, expiry, revocation, and archived/deleted boundary state server-side.

### Inputs

First implementation should accept one JSON argument:

```json
{
  "resource_classes": ["care_recipient", "care_event"],
  "resources": [
    {
      "resource_type": "care_recipient",
      "resource_id": null,
      "capabilities": ["provider_prep.preview"]
    }
  ],
  "page_size": 50
}
```

Input rules:

- `resource_classes` is optional and defaults to the first-proof classes only.
- `resources` is optional. Empty or null means return class-level summaries only.
- `resource_id` may be null for class-level access. Non-null IDs must never be echoed back if unauthorized, unknown, archived, or mismatched.
- `page_size` defaults to 50 and must be capped server-side.
- Unknown resource types, unknown capabilities, duplicate IDs, malformed resources, and oversized requests fail closed with stable non-sensitive statuses.

### Closed Vocabulary

First-proof resource types:

- `care_event`
- `care_recipient`

First-proof capabilities:

- `care_event.view`
- `care_event.append`
- `provider_prep.preview`

Authorization mapping:

- `provider_prep.preview` is a virtual product capability for Sprint 5 UX.
- The first implementation must authorize `provider_prep.preview` against the active care recipient boundary. Do not add `provider_prep` to `permission_grants.resource_type` in the first proof unless a separate reviewed migration explicitly extends the closed grant/resource vocabulary.
- If explicit grant checks are needed for provider-prep preview, map them to the existing recipient-scoped resource contract and return the projected capability as `provider_prep.preview` only in the advisory projection.
- This mapping must not imply external provider access, share/export access, document access, message access, durable note access, or profile-label access.

Access states:

- `allowed`
- `denied`
- `unavailable`

Source scopes:

- `role_default`
- `explicit_grant`
- `explicit_deny`
- `system_boundary`

Source-scope precedence:

1. `explicit_deny`
2. non-expired, non-revoked `explicit_grant`
3. `role_default`
4. `system_boundary`

When multiple inputs apply, return the winning source scope only. Do not return raw grant rows, grant IDs, grant reasons, grant authors, or losing sources.

Top-level statuses:

- `ready`
- `auth_required`
- `boundary_unavailable`
- `multiple_active_memberships`
- `stale_permission_context`
- `invalid_request`
- `unavailable`

Negative status expectations:

- unauthenticated session: `auth_required`
- missing, revoked, left, archived, unrelated, or unavailable active boundary: `boundary_unavailable`
- multiple active memberships without an explicit safe selection contract: `multiple_active_memberships`
- stale permission version or revision mismatch: `stale_permission_context`
- malformed request, unknown resource type, unknown capability, duplicate IDs beyond accepted normalization, or oversized request: `invalid_request`
- transient service or schema-cache issue: `unavailable`

In every non-`ready` status, boundary fields must be null and `resource_access` must be empty.

### Output Shape

Ready output:

```json
{
  "status": "ready",
  "app_user_id": "uuid",
  "active_care_team_id": "uuid",
  "active_care_recipient_id": "uuid",
  "membership_id": "uuid",
  "membership_status": "active",
  "role_key": "owner",
  "permission_version": "opaque-revision",
  "resource_access": [
    {
      "resource_type": "care_recipient",
      "resource_id": null,
      "capability": "provider_prep.preview",
      "access": "allowed",
      "source_scope": "role_default",
      "expires_at": null
    }
  ]
}
```

Fail-closed output:

```json
{
  "status": "boundary_unavailable",
  "app_user_id": null,
  "active_care_team_id": null,
  "active_care_recipient_id": null,
  "membership_id": null,
  "membership_status": null,
  "role_key": null,
  "permission_version": null,
  "resource_access": []
}
```

Output rules:

- Return only the allowlisted fields above.
- Do not return raw grant rows, grant reasons, emails, full user rows, care labels, relationship labels, roster labels, document titles, message metadata, provider details, event payloads, note text, raw SQL/RPC errors, tokens, secrets, share tokens, invitation tokens, or unauthorized resource identifiers.
- Deny overrides allow.
- Expired and revoked grants have no allow effect.
- Unknown, unauthorized, archived, stale, revoked, expired, malformed, or mismatched resources must produce empty summaries or denied/unavailable class summaries without echoing unauthorized resource IDs.
- If active membership is missing, revoked, left, archived, ambiguous, or multiple without explicit selection, return fail-closed output with empty `resource_access`.

## Provider Prep / Share-Intent Preview Contract

### Scope

The first provider-prep proof is preview-only and in-app only.

Allowed content sources:

- persisted medication/vitals Recent Updates already authorized for the active boundary
- timeframe and content category labels
- source labels and inclusion labels

Forbidden content sources:

- documents
- messages
- durable care notes
- profile labels or relationships
- provider details
- raw care-event payload JSON
- external share/export/download state

### Preview Request

```json
{
  "timeframe": "last_30_days",
  "content_categories": ["medications", "vitals"],
  "audience_type": "provider_visit_prep"
}
```

### Preview Response

```json
{
  "status": "ready",
  "preview_id": "opaque-preview-id",
  "timeframe": "last_30_days",
  "content_categories": ["medications", "vitals"],
  "audience_type": "provider_visit_prep",
  "external_delivery": false,
  "expires_at": null,
  "revoked": false,
  "sections": [
    {
      "section_key": "recent_updates",
      "source": "recent_updates",
      "inclusion": "included",
      "label": "Included from Recent Updates",
      "summary": "2 medication updates"
    }
  ]
}
```

Preview rules:

- `summary` is optional but recommended. When present, it must be value-safe and category/count based, such as `2 medication updates` or `1 vitals update`. It must not include medication names, vitals values, note text, labels, provider details, raw payloads, document/message contents, clinical interpretation, or external sharing state.
- `preview_id` must be opaque, non-public, non-authorizing, non-shareable, and internal-only operational metadata.
- First proof default: `preview_id` should be ephemeral or deterministic from non-sensitive revision inputs and must not represent a durable provider packet, share token, public URL, external delivery, or reusable access credential.
- `preview_id` must not be rendered in UI/status/proof surfaces, copied into audit metadata, placed in URLs, logged, included in analytics/crash reports/AI prompts/session replay, or captured in QA evidence. QA may report only whether an internal preview marker was present or absent.
- No share token, public URL, export, download, email, provider access, provider account access, Native share sheet, or delivery audit event may be created in the first proof.
- UI CTAs must be preview-only: `Review preview`, `Close preview`, or `Return to Visit Prep`.
- UI CTAs must not say `Continue`, `Share`, `Share now`, `Send`, `Download`, `Export`, `Invite provider`, or `Grant access`.
- Every preview row must show source and inclusion state such as `Included from Recent Updates`, `Not included`, or `Not shared`.
- Copy must remain coordination-only: no diagnosis, treatment guidance, risk scoring, provider approval, provider portal, EHR replacement, telemedicine, billing, or emergency language.

## Audit Contract

Audit metadata may include:

- action key
- resource class
- capability key
- audience type
- timeframe bucket
- content category keys
- expiry bucket
- revision marker
- status
- result

Audit metadata must not include:

- labels
- titles
- payloads
- note text
- medication values
- vitals values
- user details
- emails
- tokens
- provider details
- document/message content
- raw errors
- grant reasons
- unauthorized resource details

First-proof audit action keys:

- `resource_access_context_requested`
- `resource_access_context_hydrated`
- `resource_access_context_denied`
- `provider_prep_preview_requested`
- `provider_prep_preview_rendered`
- `provider_prep_preview_denied`
- `provider_prep_preview_no_delivery`

First-proof prohibited audit action keys:

- `provider_prep_shared`
- `provider_prep_exported`
- `provider_prep_downloaded`
- `provider_prep_sent`
- `provider_access_granted`
- `share_link_created`
- `share_token_created`
- `provider_packet_delivered`

No delivery, share, export, download, provider-access, public-link, or token audit action may be created in the first proof.

## QA Fixture Matrix

Required resource projection fixtures:

- owner ready
- primary caregiver ready
- family/viewer/provider alias where applicable
- explicit allow
- explicit deny overriding role/default allow
- expired grant ignored
- revoked grant ignored
- unrelated user denied
- archived team denied
- archived recipient denied
- multiple active memberships fail closed
- stale permission version or revision mismatch
- mixed authorized and unauthorized requested resource list
- malformed or unknown resource type
- malformed or unknown capability
- duplicate requested IDs
- null or empty requested list
- pagination or max-request boundary
- restricted versus unrestricted placeholder resources
- removed conversation participant, if conversation resource class is added later
- unauthorized requested resource ID returns no ID/detail
- denied resources cannot be read or written through underlying RPC/RLS path
- audit-read denial

Required provider-prep preview fixtures:

- included medication/vitals item
- explicitly excluded category
- empty preview
- timeframe boundary
- stale access before preview
- revoked access before preview
- denied access before preview
- no share token/public URL/export/download/provider access/external delivery/delivery audit event

## QA Evidence Packet

QA evidence must include:

- feature path and scope
- synthetic fixture aliases only
- viewport and platform, including primary `390x844`
- build, lint, and focused test status
- authorized success status
- negative status summaries
- resource class and capability keys only
- provider-prep/share-intent preview status
- preview marker present/absent only; never preview identifier values
- no-external-delivery status
- audit metadata key summary
- console and leakage scan summary
- accessibility/mobile smoke summary

Mobile/accessibility assertions:

- primary proof at `390x844`
- readable status and preview surfaces
- no overlapping text
- reachable tap targets
- keyboard and focus path where practical
- status copy understandable without color alone
- preview rows readable without horizontal scrolling
- source and inclusion badges wrap cleanly
- bottom-sheet or modal implementations have clear focus order, escape/back behavior, and one obvious close path

QA evidence must avoid:

- raw Supabase responses
- network payloads
- SQL dumps
- JWT/session/access/refresh tokens
- cookies
- service-role or anon keys
- emails
- UUIDs
- backend preview identifiers
- client event IDs
- care event IDs
- care team or recipient IDs
- raw grant rows or reasons
- payload JSON
- note text
- document/message content
- provider summary full text
- medication/vitals values in proof/status snippets
- raw RPC/SQL errors
- real person names
- real care labels
- unauthorized resource details

## Sprint 6 Boundary

Sprint 6 may choose one broader lane only after Sprint 5 contracts pass:

- Documents/Vault
- Messages
- Invitations/Care Team
- Provider externalization
- Durable care notes
- Native

Each lane needs its own implementation plan, Security/Privacy review, QA proof, and explicit Product Planning go/no-go.
