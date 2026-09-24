import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CareActorRole,
  CareNoteAddedEvent,
  HealthEvent,
  HealthEventSource,
  Medication,
  VitalsReading,
} from "@/lib/health-events";

export type PersistedCareBoundary = {
  actorUserId: string;
  careRecipientId: string;
  careTeamId: string;
};

export type CareEventPersistResult =
  | { reason: "persistence-not-ready"; status: "skipped" }
  | { reason: "write-failed"; status: "error" }
  | { status: "persisted" };

export type CareEventReadBackResult =
  | { event: PersistedCareEvent; status: "read" }
  | { reason: "persistence-not-ready"; status: "skipped" }
  | { reason: "read-failed"; status: "error" }
  | { reason: "not-found"; status: "missing" };

export type PersistedHealthEventsReadResult =
  | { events: HealthEvent[]; status: "read" }
  | { reason: "persistence-not-ready"; status: "skipped" }
  | { reason: "read-failed"; status: "error" };

type AppendCareEventCommand = {
  care_recipient_id: string;
  care_team_id: string;
  causation_id?: string;
  client_event_id: string;
  correlation_id: string;
  event_source: HealthEvent["source"];
  event_type: HealthEvent["type"];
  occurred_at: string;
  operational_context: string;
  payload: HealthEvent["payload"];
  schema_version: HealthEvent["schemaVersion"];
};

type AppendCareEventResult = {
  care_event_id: string | null;
  care_recipient_id: string | null;
  care_team_id: string | null;
  client_event_id: string | null;
  created_at: string | null;
  event_type: HealthEvent["type"] | null;
  occurred_at: string | null;
  read_back: boolean;
  schema_version: HealthEvent["schemaVersion"] | null;
  status: string;
};

export type PersistedCareEvent = {
  actor_user_id: string;
  care_recipient_id: string;
  care_team_id: string;
  client_event_id: string;
  created_at: string;
  event_type: HealthEvent["type"];
  id: string;
  occurred_at: string;
  schema_version: HealthEvent["schemaVersion"];
};

type PersistedCareEventWithPayload = {
  causation_id: string | null;
  client_event_id: string;
  correlation_id: string;
  created_at: string;
  event_source: HealthEventSource;
  event_type: HealthEvent["type"];
  occurred_at: string;
  operational_context: string;
  payload: unknown;
  schema_version: HealthEvent["schemaVersion"];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HYDRATABLE_EVENT_TYPES = [
  "CareNoteAddedEvent",
  "MedicationScheduledEvent",
  "MedicationTakenEvent",
  "VitalsRecordedEvent",
] satisfies HealthEvent["type"][];
const MEDICATION_VITALS_EVENT_TYPES = [
  "MedicationScheduledEvent",
  "MedicationTakenEvent",
  "VitalsRecordedEvent",
] satisfies HealthEvent["type"][];
const PERSISTED_ACTOR_ROLE: CareActorRole = "family-member";

export function isPersistableCareBoundary(
  boundary: PersistedCareBoundary | null,
): boundary is PersistedCareBoundary {
  return Boolean(
    boundary &&
    UUID_PATTERN.test(boundary.actorUserId) &&
    UUID_PATTERN.test(boundary.careRecipientId) &&
    UUID_PATTERN.test(boundary.careTeamId),
  );
}

export function mapHealthEventToAppendCareEventCommand(
  event: HealthEvent,
  boundary: PersistedCareBoundary,
): AppendCareEventCommand {
  return {
    care_recipient_id: boundary.careRecipientId,
    care_team_id: boundary.careTeamId,
    causation_id: event.causationId,
    client_event_id: event.id,
    correlation_id: event.correlationId,
    event_source: event.source,
    event_type: event.type,
    occurred_at: event.occurredAt,
    operational_context: event.operationalContext,
    payload: event.payload,
    schema_version: event.schemaVersion,
  };
}

export function isPersistableHealthEvent(event: HealthEvent) {
  return (HYDRATABLE_EVENT_TYPES as readonly HealthEvent["type"][]).includes(event.type);
}

export function isPersistableMedicationVitalsEvent(event: HealthEvent) {
  return (MEDICATION_VITALS_EVENT_TYPES as readonly HealthEvent["type"][]).includes(event.type);
}

export async function persistHealthEvent({
  boundary,
  client,
  event,
}: {
  boundary: PersistedCareBoundary | null;
  client: SupabaseClient | null;
  event: HealthEvent;
}): Promise<CareEventPersistResult> {
  if (!client || !isPersistableCareBoundary(boundary)) {
    return { reason: "persistence-not-ready", status: "skipped" };
  }

  if (!isPersistableHealthEvent(event)) {
    return { reason: "persistence-not-ready", status: "skipped" };
  }

  const command = mapHealthEventToAppendCareEventCommand(event, boundary);
  const { data, error } = await client
    .rpc("append_care_event", {
      p_care_recipient_id: command.care_recipient_id,
      p_care_team_id: command.care_team_id,
      p_causation_id: command.causation_id ?? null,
      p_client_event_id: command.client_event_id,
      p_correlation_id: command.correlation_id,
      p_event_source: command.event_source,
      p_event_type: command.event_type,
      p_occurred_at: command.occurred_at,
      p_operational_context: command.operational_context,
      p_payload: command.payload,
      p_schema_version: command.schema_version,
    })
    .maybeSingle<AppendCareEventResult>();

  if (error || !data || (data.status !== "inserted" && data.status !== "duplicate")) {
    return { reason: "write-failed", status: "error" };
  }

  return { status: "persisted" };
}

export async function readPersistedHealthEvent({
  boundary,
  client,
  clientEventId,
}: {
  boundary: PersistedCareBoundary | null;
  client: SupabaseClient | null;
  clientEventId: string;
}): Promise<CareEventReadBackResult> {
  if (!client || !isPersistableCareBoundary(boundary)) {
    return { reason: "persistence-not-ready", status: "skipped" };
  }

  const { data, error } = await client
    .from("care_events")
    .select(
      "id, client_event_id, care_team_id, care_recipient_id, actor_user_id, event_type, occurred_at, schema_version, created_at",
    )
    .eq("care_team_id", boundary.careTeamId)
    .eq("care_recipient_id", boundary.careRecipientId)
    .eq("client_event_id", clientEventId)
    .maybeSingle<PersistedCareEvent>();

  if (error) {
    return { reason: "read-failed", status: "error" };
  }

  if (!data) {
    return { reason: "not-found", status: "missing" };
  }

  return { event: data, status: "read" };
}

export async function readRecentPersistedHealthEvents({
  boundary,
  client,
  includeCareNotes = false,
  limit = 20,
}: {
  boundary: PersistedCareBoundary | null;
  client: SupabaseClient | null;
  includeCareNotes?: boolean;
  limit?: number;
}): Promise<PersistedHealthEventsReadResult> {
  if (!client || !isPersistableCareBoundary(boundary)) {
    return { reason: "persistence-not-ready", status: "skipped" };
  }

  const { data, error } = await client
    .from("care_events")
    .select(
      "client_event_id, event_type, event_source, occurred_at, created_at, operational_context, correlation_id, causation_id, schema_version, payload",
    )
    .eq("care_team_id", boundary.careTeamId)
    .eq("care_recipient_id", boundary.careRecipientId)
    .in("event_type", includeCareNotes ? HYDRATABLE_EVENT_TYPES : MEDICATION_VITALS_EVENT_TYPES)
    .order("occurred_at", { ascending: false })
    .limit(limit)
    .returns<PersistedCareEventWithPayload[]>();

  if (error) {
    return { reason: "read-failed", status: "error" };
  }

  return {
    events: (data ?? [])
      .map((event) => reconstructPersistedHealthEvent(event))
      .filter((event): event is HealthEvent => Boolean(event)),
    status: "read",
  };
}

function reconstructPersistedHealthEvent(event: PersistedCareEventWithPayload): HealthEvent | null {
  if (
    event.schema_version !== 1 ||
    !event.client_event_id ||
    !event.correlation_id ||
    !event.occurred_at ||
    !event.created_at
  ) {
    return null;
  }

  const base = {
    actorId: "persisted-care-team",
    actorName: "Care team",
    actorRole: PERSISTED_ACTOR_ROLE,
    careSubjectId: "active-care-recipient",
    causationId: event.causation_id ?? undefined,
    correlationId: event.correlation_id,
    createdAt: formatPersistedTimestamp(event.created_at),
    id: event.client_event_id,
    occurredAt: event.occurred_at,
    operationalContext: event.operational_context,
    schemaVersion: 1,
    source: event.event_source,
  } satisfies Omit<HealthEvent, "payload" | "type">;

  if (event.event_type === "MedicationTakenEvent" && isMedicationTakenPayload(event.payload)) {
    return {
      ...base,
      payload: { medicationId: event.payload.medicationId },
      type: "MedicationTakenEvent",
    };
  }

  if (event.event_type === "MedicationScheduledEvent" && isMedication(event.payload)) {
    return {
      ...base,
      payload: event.payload,
      type: "MedicationScheduledEvent",
    };
  }

  if (event.event_type === "VitalsRecordedEvent" && isVitalsRecordedPayload(event.payload)) {
    return {
      ...base,
      payload: { reading: event.payload.reading },
      type: "VitalsRecordedEvent",
    };
  }

  if (event.event_type === "CareNoteAddedEvent" && isCareNoteAddedPayload(event.payload)) {
    return {
      ...base,
      payload: event.payload,
      type: "CareNoteAddedEvent",
    };
  }

  return null;
}

function formatPersistedTimestamp(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(timestamp);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isMedication(value: unknown): value is Medication {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.dose) &&
    isString(value.frequency) &&
    isString(value.reminderTime)
  );
}

function isMedicationTakenPayload(value: unknown): value is { medicationId: string } {
  return isRecord(value) && isString(value.medicationId);
}

function isVitalsReading(value: unknown): value is VitalsReading {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.label) &&
    isString(value.bloodPressure) &&
    isString(value.weight) &&
    isString(value.context) &&
    isString(value.recordedAt) &&
    isNumber(value.heartRate) &&
    isNumber(value.systolic)
  );
}

function isVitalsRecordedPayload(value: unknown): value is { reading: VitalsReading } {
  return isRecord(value) && isVitalsReading(value.reading);
}

function isCareNoteAddedPayload(value: unknown): value is CareNoteAddedEvent["payload"] {
  return (
    isRecord(value) &&
    isString(value.note) &&
    value.note.trim().length > 0 &&
    value.note.trim().length <= 2000 &&
    isString(value.noteType) &&
    (value.noteType === "caregiver-context" ||
      value.noteType === "operational-concern" ||
      value.noteType === "symptom-observation" ||
      value.noteType === "recovery-observation")
  );
}
