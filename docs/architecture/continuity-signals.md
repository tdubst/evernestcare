# Continuity Signals

Continuity signals are operational awareness indicators derived from replayable care events. They help caregivers see coordination gaps without becoming diagnostic, predictive, or autonomous clinical software.

## Philosophy

Signals answer practical coordination questions:

- What happened recently?
- What expected care activity is not visible?
- What changed in the operational record?
- What may need human follow-up?

Signals are projections. The operational event history remains authoritative.

## Initial Signal Examples

- Missed or unconfirmed medication activity.
- Missing vitals in a selected timeframe.
- Unresolved caregiver observations.
- Post-discharge continuity gaps.
- Missing follow-up artifacts.
- Inactive care-circle participation.

## Deterministic Generation

Signals must be generated from typed operational events, timeline projections, care-circle metadata, and current timeframe filters. The same event history and query must produce the same signal set.

Signals may reference a source event when a timeline item explains the signal. They must not depend on hidden state, opaque AI output, or external inference.

## Visibility Expectations

Signal copy should be calm, factual, and specific. A signal should make the gap inspectable without creating alarm fatigue.

Supported tones:

- steady: informational continuity visibility
- watch: useful to review
- follow-up: operational confirmation needed

## Expiration Philosophy

Signals expire naturally when the projection no longer supports them. For example, a missing vitals signal disappears after a vitals event enters the selected timeframe.

## Boundaries

Signals are operational awareness indicators. They are not:

- diagnosis generation
- treatment suggestions
- predictive medical AI
- autonomous healthcare recommendations
- emergency escalation logic
