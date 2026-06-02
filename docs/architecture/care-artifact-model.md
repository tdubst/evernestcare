# Care Artifact Model

Care artifacts are operational continuity objects linked to care events. They are not a general cloud drive, document management system, or medical record replacement.

## Philosophy

Artifacts exist to make handoffs, visits, medication review, and family coordination easier to reconstruct. Each artifact should answer:

- What was attached.
- Who attached it.
- Who it concerns.
- When it entered the care timeline.
- Why it matters operationally.

The operational event history remains authoritative. Artifact UI is a projection of artifact-linked events.

## Supported Artifact Examples

- Discharge paperwork.
- Medication photos.
- Wound photos.
- Lab screenshots.
- Imaging exports.
- Insurance cards.
- Referral documents.
- Rehab instructions.

## Attribution Rules

Every artifact must carry actor attribution through the event runtime. The timeline should be able to show who attached the artifact, under what role, and in what operational context.

Artifacts should not silently appear in the interface without an event. Storage metadata may exist later, but visibility must derive from replayable operational events.

## Timeline Linkage

Artifact attachment creates an append-only operational event. Timeline projections may group artifacts with medications, vitals, notes, appointments, or provider summaries, but projections may not mutate artifact truth.

## Summary Visibility

Artifacts may be marked as visible in provider summaries. Summary inclusion is factual only:

- artifact title
- artifact type or preview label
- linked context
- attribution when relevant

Evernest Care does not interpret document contents or generate clinical conclusions from artifacts.

## Non-Goals

- Generic cloud storage.
- Enterprise document management.
- Provider portal workflows.
- AI interpretation of uploaded records.
- Clinical document decision support.
