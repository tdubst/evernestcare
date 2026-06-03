import type { SupabaseClient } from "@supabase/supabase-js";

import type { HealthEvent } from "@/lib/health-events";

export type PersistedCareBoundary = {
  actorUserId: string;
  careRecipientId: string;
  careTeamId: string;
};

export type CareEventPersistResult =
  | { reason: "persistence-not-ready"; status: "skipped" }
  | { reason: "write-failed"; status: "error" }
  | { status: "persisted" };

type CareEventInsert = {
  actor_display_name: string;
  actor_role: HealthEvent["actorRole"];
  actor_user_id: string;
  care_recipient_id: string;
  care_team_id: string;
  causation_id?: string;
  client_event_id: string;
  correlation_id: string;
  display_timestamp: string;
  event_source: HealthEvent["source"];
  event_type: HealthEvent["type"];
  occurred_at: string;
  operational_context: string;
  payload: HealthEvent["payload"];
  schema_version: HealthEvent["schemaVersion"];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function mapHealthEventToCareEventInsert(
  event: HealthEvent,
  boundary: PersistedCareBoundary,
): CareEventInsert {
  return {
    actor_display_name: event.actorName,
    actor_role: event.actorRole,
    actor_user_id: boundary.actorUserId,
    care_recipient_id: boundary.careRecipientId,
    care_team_id: boundary.careTeamId,
    causation_id: event.causationId,
    client_event_id: event.id,
    correlation_id: event.correlationId,
    display_timestamp: event.createdAt,
    event_source: event.source,
    event_type: event.type,
    occurred_at: event.occurredAt,
    operational_context: event.operationalContext,
    payload: event.payload,
    schema_version: event.schemaVersion,
  };
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

  const { error } = await client
    .from("care_events")
    .upsert(mapHealthEventToCareEventInsert(event, boundary), {
      ignoreDuplicates: true,
      onConflict: "care_team_id,client_event_id",
    });

  if (error) {
    return { reason: "write-failed", status: "error" };
  }

  return { status: "persisted" };
}
