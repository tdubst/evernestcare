# Collaborative Event Lineage

Collaborative event lineage extends health events with actor and care subject attribution. It preserves replay-safe operational continuity without realtime collaboration infrastructure.

## Actor Attribution

Every collaborative event should identify:

- who performed the action
- for whom the action was performed
- under what role
- when it occurred
- in what operational context

Attribution fields should be explicit event metadata, not inferred from UI state.

## Event Ownership

The care subject anchors event ownership. The actor contributes the action. The care circle provides the collaboration boundary.

Events remain append-only and projection-derived. Attribution metadata travels with the event so replay can reconstruct both operational state and collaborative context.

## Collaborative Operational Replay

Replay must preserve:

- event type
- care subject
- actor
- actor role
- occurrence time
- operational context
- correlation and causation links when present
- schema version

Given the same ordered event list, collaborative projections should produce the same timeline, summary, and attribution output.

## Attribution Visibility

Attribution should be visible where it supports care continuity:

- timeline rows
- medication and vitals history
- provider summaries
- collaborative notes

Visibility should remain factual and concise. It should not introduce social feed behavior.

## Operational Lineage Guarantees

Collaborative events should answer:

- who performed an action
- for whom
- under what role
- when
- in what operational context

Lineage should be observable without hidden state, background automation, or implicit mutations.

## Non-Goals

- No realtime collaboration.
- No chat or messaging infrastructure.
- No autonomous workflow chaining.
- No opaque permission inference.
- No clinical interpretation.
