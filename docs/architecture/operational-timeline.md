# Operational Timeline

The operational timeline is a replayable projection of Evernest health events. It is not a separate source of truth.

## Replay Philosophy

- Operational event history is append-only.
- Timeline views are reconstructed from ordered events.
- Reducers own operational truth; UI components render projections.
- Replay should produce the same operational state when given the same event list in the same order.
- Timeline rendering must not mutate events or derived state.

## Timeline Reconstruction

Timeline reconstruction starts with health events and applies explicit projection rules:

1. Select the event list.
2. Filter by timeframe.
3. Filter by event family.
4. Sort by event occurrence time with stable fallback to original event order.
5. Render grouped or chronological rows.

UI components are projections of operational state, not owners of truth.

## Event Ordering Guarantees

Events should carry an occurrence timestamp and an append order. Alpha local state uses the in-memory event order as the fallback authority. Future persistence should store append order server-side.

Ordering rules:

- New events append to operational history.
- Timeline projections may reverse or group events for display.
- Projections must not rewrite event order.
- Equal timestamps preserve append order.

## Timeframe Querying

Initial supported timeframe modes:

- Last 24 hours.
- Last 7 days.
- Last 30 days.
- Custom range.

Future modes may include "since hospitalization", "since medication change", and "since symptom onset" once those event anchors exist.

## Operational Filtering

Initial filters:

- all operational events
- medications
- vitals

Future filters may include symptoms, provider interactions, uploaded records, and caregiver notes.

## Projection Boundaries

Timeline projections may:

- filter events
- order events
- group events
- summarize factual operational activity

Timeline projections may not:

- mutate source events
- infer medical meaning
- generate recommendations
- create hidden state
- bypass permissions or audit expectations

## Replay-Safe Rendering

Rendering should be deterministic for a given event list and query. Components may hold view controls such as selected timeframe or filter, but operational facts must come from event history.
