# Supabase Persistence Foundation

Evernest persistence starts with the care graph and append-only care events. The frontend reducer remains the local interaction authority during beta, while Supabase becomes the durable store once authenticated users, care teams, and care recipients are hydrated.

## Persistence Philosophy

- Persist operational history, not hidden UI state.
- Keep health events append-only and replay-friendly.
- Use RLS as the server-side trust boundary.
- Keep prototype/local IDs out of durable tables.
- Avoid writing PHI into audit metadata, console output, analytics, or crash logs.

## Initial Durable Runtime

The `care_events` table stores medication, vitals, care note, artifact, and reminder events using the canonical typed event shape from `src/lib/health-events.ts`.

Each row includes:

- care team and care recipient ownership
- actor attribution
- event type and source
- correlation and causation IDs
- schema version
- event payload
- occurrence timestamp

The row is immutable after insert. Projections may be rebuilt from the event stream, but projections do not own operational truth.

## RLS Boundary

Care-event reads require:

- active recipient visibility
- active care-team membership
- `care_event.view`

Care-event writes require:

- authenticated app user identity
- matching actor user
- active care-team membership
- recipient/team alignment
- event-specific capability

Medication events require medication permissions. Vitals events require vitals permissions. Care notes require care-note permissions. Artifact events require upload permissions.

## Client Boundary

The client-side persistence adapter skips writes until all durable IDs are available:

- app user ID
- care team ID
- care recipient ID

This prevents prototype IDs from leaking into Supabase while preserving current local UX.

## Non-Goals

- No realtime sync.
- No broad backend orchestration.
- No provider portal behavior.
- No AI interpretation.
- No diagnosis, treatment guidance, or predictive healthcare logic.
