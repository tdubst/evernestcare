# Health Events

Evernest health events are the lightweight operational record for health-adjacent user actions. They preserve lineage for medication and vitals workflows without introducing automation infrastructure or backend complexity during alpha.

## Health Event Philosophy

- Operational actions become events before they become UI state.
- Events are immutable operational history.
- Workflow progression should be event-first: action, event, deterministic state transition, visible history.
- Replayability matters: current local state should be derivable from the ordered event list.
- State transitions should be explicit, inspectable, and bounded to the workflow that produced them.

Health events do not make medical judgments. They record what a user or trusted integration reports.

## Initial Event Types

- `MedicationTakenEvent`: a user marks a scheduled medication dose as taken.
- `MedicationScheduledEvent`: a user adds or updates a prescribed medication schedule.
- `VitalsRecordedEvent`: a user records a vitals reading manually or through a future trusted source.
- `ReminderDismissedEvent`: a user dismisses a medication or care reminder.
- `MedicationMissedEvent`: a scheduled dose is marked missed by user action or future reminder logic.

## Event Lifecycle

1. Creation: a user action or trusted integration creates a typed event with actor, timestamp, source, and payload.
2. Validation: the event must match its schema and reference a known care recipient or local alpha context.
3. Persistence expectations: alpha uses local in-memory state; Supabase persistence should later store append-only events before derived state.
4. State transition relationship: reducers derive medication adherence, schedules, vitals history, and visible status from events.
5. Observability expectations: recent events should be visible in the relevant workflow so users and testers can inspect what happened.

## Non-Goals

- No autonomous medical recommendations.
- No predictive analytics.
- No provider automation.
- No hidden AI decisions.
- No clinical decision engine.
- No emergency triage workflow.

## Future Expansion Boundaries

Future operational pathways may include reminders, alerts, provider workflows, longitudinal analytics, Apple Health integration, and Bluetooth device ingestion.

These remain bounded event sources or event consumers. They should not bypass explicit permission checks, user consent, audit expectations, or deterministic event creation.
