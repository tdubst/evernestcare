# Care Profile Model

Evernest separates longitudinal background profile data from operational event runtime data. This distinction is foundational.

## Longitudinal Background Profile

The longitudinal profile describes relatively stable context that helps caregivers orient care coordination.

Examples:

- past medical history
- past surgical history
- allergies
- chronic conditions
- providers
- emergency contacts
- hospitalization history
- insurance metadata for informational storage only

Profile data should be lightweight, progressively entered, and caregiver-friendly. It should not become a large intake form or EHR replacement.

## Operational Event Runtime

The operational runtime records what happened over time.

Examples:

- medication adherence
- vitals recordings
- symptom events
- provider visits
- hospitalizations
- operational escalations
- caregiver notes

Operational runtime data is event-first, append-only, replayable, and reducer-derived.

## Boundary Rules

- Profile data provides background context.
- Event runtime provides operational history.
- Timeline and provider summaries derive from event history.
- Profile data may annotate summaries, but it must not override operational event truth.
- UI components may edit profile fields or dispatch operational events, but they do not own canonical state.

## Future Expansion

Future persistence should store background profile data and operational events separately. Future provider exports should clearly distinguish background context from event-derived activity.

Insurance metadata remains informational only and should not introduce billing or claims workflows during alpha.
