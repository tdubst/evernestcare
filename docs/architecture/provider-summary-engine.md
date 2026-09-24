# Provider Summary Engine

The provider summary engine produces deterministic, factual summaries from operational event history. It is a projection layer, not a diagnostic system.

## Provider Summary Philosophy

- Summaries are operational only.
- Summaries should be concise, factual, and timeframe-bound.
- Summary generation should be deterministic for the same event list and query.
- Source events remain authoritative.
- Export and sharing should be explicit user actions with permission checks.

Provider summaries should help a caregiver communicate what happened. They should not decide what it means medically.

## Supported Timeframe Modes

Initial:

- Last 24 hours.
- Last 7 days.
- Last 30 days.
- Custom date range.

Future-safe anchors:

- Since hospitalization.
- Since medication change.
- Since symptom onset.

These future modes require explicit anchor events before implementation.

## Future Filtering Support

Future summaries may filter by:

- medications
- vitals
- symptoms
- provider interactions
- uploaded records
- caregiver notes

Filters should remain deterministic projections of event history.

## Summary Shape

Initial summaries should include:

- timeframe label
- event counts
- medication activity
- vitals activity
- recent operational notes
- source limitation statement

Template-based summaries are preferred during alpha because they are deterministic and reviewable.

## Prohibited Behavior

The provider summary engine must not produce:

- treatment recommendations
- diagnosis generation
- predictive AI
- hidden AI conclusions
- clinical decision support
- provider automation

If future AI summarization is introduced, it must be constrained to factual condensation of selected events with clear source visibility and human review.
