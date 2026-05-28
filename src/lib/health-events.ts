export type HealthEventType =
  | "MedicationTakenEvent"
  | "MedicationScheduledEvent"
  | "VitalsRecordedEvent"
  | "CareNoteAddedEvent"
  | "ReminderDismissedEvent"
  | "MedicationMissedEvent";

export type HealthEventSource = "manual" | "reminder" | "device";
export type CareActorRole = "primary-caregiver" | "family-member" | "provider" | "supporter";
export type TimelineFilter = "all" | "medications" | "vitals" | "notes";
export type TimeframePreset = "24h" | "7d" | "30d" | "custom";

export type HealthEventBase<TType extends HealthEventType, TPayload> = {
  actorId: string;
  actorName: string;
  actorRole: CareActorRole;
  careSubjectId: string;
  causationId?: string;
  correlationId: string;
  createdAt: string;
  id: string;
  occurredAt: string;
  operationalContext: string;
  payload: TPayload;
  schemaVersion: 1;
  source: HealthEventSource;
  type: TType;
};

export type CareSubject = {
  displayName: string;
  id: string;
  relationshipContext: string;
};

export type CareActor = {
  displayName: string;
  id: string;
  relationship: string;
  role: CareActorRole;
};

export type CareCircle = {
  actors: CareActor[];
  careSubject: CareSubject;
  id: string;
  name: string;
};

export type EventAttributionInput = {
  actor?: CareActor;
  careSubjectId?: string;
  causationId?: string;
  correlationId?: string;
  operationalContext?: string;
};

export type Medication = {
  dose: string;
  frequency: string;
  id: string;
  name: string;
  reminderTime: string;
};

export type MedicationTakenEvent = HealthEventBase<
  "MedicationTakenEvent",
  {
    medicationId: string;
  }
>;

export type MedicationScheduledEvent = HealthEventBase<"MedicationScheduledEvent", Medication>;

export type VitalsReading = {
  bloodPressure: string;
  context: string;
  heartRate: number;
  id: string;
  label: string;
  recordedAt: string;
  systolic: number;
  weight: string;
};

export type VitalsRecordedEvent = HealthEventBase<
  "VitalsRecordedEvent",
  {
    reading: VitalsReading;
  }
>;

export type CareNoteAddedEvent = HealthEventBase<
  "CareNoteAddedEvent",
  {
    note: string;
    noteType:
      | "symptom-observation"
      | "caregiver-context"
      | "recovery-observation"
      | "operational-concern";
  }
>;

export type ReminderDismissedEvent = HealthEventBase<
  "ReminderDismissedEvent",
  {
    reminderId: string;
  }
>;

export type MedicationMissedEvent = HealthEventBase<
  "MedicationMissedEvent",
  {
    medicationId: string;
  }
>;

export type HealthEvent =
  | MedicationTakenEvent
  | MedicationScheduledEvent
  | VitalsRecordedEvent
  | CareNoteAddedEvent
  | ReminderDismissedEvent
  | MedicationMissedEvent;

export type MedicationAdherence = {
  actorName: string;
  medicationId: string;
  status: "taken" | "missed";
  timestamp: string;
};

export type HealthEventState = {
  adherence: Record<string, MedicationAdherence>;
  careCircle: CareCircle;
  events: HealthEvent[];
  medications: Medication[];
  vitalsReadings: VitalsReading[];
};

export type TimelineQuery = {
  customRange?: {
    end: Date;
    start: Date;
  };
  filter: TimelineFilter;
  timeframe: TimeframePreset;
};

export type TimelineItem = {
  description: string;
  event: HealthEvent;
  family: Exclude<TimelineFilter, "all">;
  orderIndex: number;
};

export type ProviderSummary = {
  eventCount: number;
  lines: string[];
  medicationEventCount: number;
  timeframeLabel: string;
  vitalsEventCount: number;
};

export type CareProfile = {
  allergies: string[];
  chronicConditions: string[];
  emergencyContacts: string[];
  hospitalizationHistory: string[];
  insuranceInfo: string;
  medicalHistory: string[];
  providers: string[];
  surgicalHistory: string[];
};

const DEFAULT_ACTOR = "Sarah";
const DEFAULT_CARE_SUBJECT_ID = "margaret-chen";

export const DEFAULT_CARE_ACTORS: CareActor[] = [
  {
    displayName: "Sarah Chen",
    id: "actor-sarah",
    relationship: "Daughter",
    role: "primary-caregiver",
  },
  {
    displayName: "David Chen",
    id: "actor-david",
    relationship: "Son",
    role: "family-member",
  },
  {
    displayName: "Dr. Okafor",
    id: "actor-okafor",
    relationship: "Cardiologist",
    role: "provider",
  },
  {
    displayName: "Maya Lee",
    id: "actor-maya",
    relationship: "Neighbor",
    role: "supporter",
  },
];

export const DEFAULT_CARE_CIRCLE: CareCircle = {
  actors: DEFAULT_CARE_ACTORS,
  careSubject: {
    displayName: "Margaret Chen",
    id: DEFAULT_CARE_SUBJECT_ID,
    relationshipContext: "Older adult care",
  },
  id: "circle-margaret-chen",
  name: "Margaret's care circle",
};

export function createInitialHealthEventState(): HealthEventState {
  return {
    adherence: {
      lisinopril: {
        actorName: "Sarah",
        medicationId: "lisinopril",
        status: "taken",
        timestamp: "Today, 8:14 AM",
      },
    },
    careCircle: DEFAULT_CARE_CIRCLE,
    events: [
      createMedicationTakenEvent({
        actor: DEFAULT_CARE_ACTORS[0],
        createdAt: "Today, 8:14 AM",
        eventId: "event-med-lisinopril-taken",
        medicationId: "lisinopril",
        occurredAt: new Date().toISOString(),
      }),
      createCareNoteAddedEvent({
        actor: DEFAULT_CARE_ACTORS[1],
        createdAt: "Yesterday, 6:20 PM",
        note: "Dinner went well. Margaret seemed tired after the walk but recovered after resting.",
        noteType: "caregiver-context",
        occurredAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      }),
    ],
    medications: [
      {
        dose: "10 mg",
        frequency: "Once daily",
        id: "lisinopril",
        name: "Lisinopril",
        reminderTime: "8:00 AM",
      },
      {
        dose: "500 mg",
        frequency: "Twice daily",
        id: "metformin",
        name: "Metformin",
        reminderTime: "1:00 PM",
      },
      {
        dose: "20 mg",
        frequency: "Evening",
        id: "atorvastatin",
        name: "Atorvastatin",
        reminderTime: "8:00 PM",
      },
    ],
    vitalsReadings: [
      createVitalsReading("Mon", 132, 76, "150 lb", "Manual log"),
      createVitalsReading("Tue", 128, 74, "149 lb", "Manual log"),
      createVitalsReading("Wed", 130, 75, "149 lb", "Manual log"),
      createVitalsReading("Thu", 126, 73, "148 lb", "Manual log"),
      createVitalsReading("Fri", 124, 72, "148 lb", "Manual log"),
    ],
  };
}

export function createMedicationTakenEvent({
  actor = DEFAULT_CARE_ACTORS[0],
  careSubjectId,
  causationId,
  correlationId,
  createdAt = formatEventTimestamp(),
  eventId,
  medicationId,
  occurredAt = new Date().toISOString(),
  operationalContext = "medication-adherence",
}: {
  actor?: CareActor;
  careSubjectId?: string;
  causationId?: string;
  correlationId?: string;
  createdAt?: string;
  eventId?: string;
  medicationId: string;
  occurredAt?: string;
  operationalContext?: string;
}): MedicationTakenEvent {
  return {
    ...createAttributionMetadata(actor, {
      careSubjectId,
      causationId,
      correlationId,
      operationalContext,
    }),
    createdAt,
    id: eventId ?? createEventId("medication-taken", medicationId),
    occurredAt,
    payload: { medicationId },
    source: "manual",
    type: "MedicationTakenEvent",
  };
}

export function createMedicationScheduledEvent({
  actor = DEFAULT_CARE_ACTORS[0],
  careSubjectId,
  causationId,
  correlationId,
  createdAt = formatEventTimestamp(),
  medication,
  occurredAt = new Date().toISOString(),
  operationalContext = "medication-schedule",
}: {
  actor?: CareActor;
  careSubjectId?: string;
  causationId?: string;
  correlationId?: string;
  createdAt?: string;
  medication: Medication;
  occurredAt?: string;
  operationalContext?: string;
}): MedicationScheduledEvent {
  return {
    ...createAttributionMetadata(actor, {
      careSubjectId,
      causationId,
      correlationId,
      operationalContext,
    }),
    createdAt,
    id: createEventId("medication-scheduled", medication.id),
    occurredAt,
    payload: medication,
    source: "manual",
    type: "MedicationScheduledEvent",
  };
}

export function createVitalsRecordedEvent({
  actor = DEFAULT_CARE_ACTORS[0],
  careSubjectId,
  causationId,
  correlationId,
  createdAt = formatEventTimestamp(),
  occurredAt = new Date().toISOString(),
  operationalContext = "vitals-recording",
  reading,
}: {
  actor?: CareActor;
  careSubjectId?: string;
  causationId?: string;
  correlationId?: string;
  createdAt?: string;
  occurredAt?: string;
  operationalContext?: string;
  reading: VitalsReading;
}): VitalsRecordedEvent {
  return {
    ...createAttributionMetadata(actor, {
      careSubjectId,
      causationId,
      correlationId,
      operationalContext,
    }),
    createdAt,
    id: createEventId("vitals-recorded", reading.id),
    occurredAt,
    payload: { reading: { ...reading, recordedAt: createdAt } },
    source: "manual",
    type: "VitalsRecordedEvent",
  };
}

export function createCareNoteAddedEvent({
  actor = DEFAULT_CARE_ACTORS[0],
  careSubjectId,
  causationId,
  correlationId,
  createdAt = formatEventTimestamp(),
  note,
  noteType,
  occurredAt = new Date().toISOString(),
  operationalContext = "caregiver-note",
}: EventAttributionInput & {
  createdAt?: string;
  note: string;
  noteType: CareNoteAddedEvent["payload"]["noteType"];
  occurredAt?: string;
}): CareNoteAddedEvent {
  return {
    ...createAttributionMetadata(actor, {
      careSubjectId,
      causationId,
      correlationId,
      operationalContext,
    }),
    createdAt,
    id: createEventId("care-note", noteType),
    occurredAt,
    payload: { note, noteType },
    source: "manual",
    type: "CareNoteAddedEvent",
  };
}

export function createVitalsReading(
  label: string,
  systolic: number,
  heartRate: number,
  weight: string,
  context: string,
): VitalsReading {
  return {
    bloodPressure: `${systolic}/78`,
    context,
    heartRate,
    id: createEventId("vitals-reading", label.toLowerCase()),
    label,
    recordedAt: label,
    systolic,
    weight,
  };
}

export function healthEventReducer(state: HealthEventState, event: HealthEvent): HealthEventState {
  const events = [event, ...state.events];

  switch (event.type) {
    case "MedicationTakenEvent":
      return {
        ...state,
        adherence: {
          ...state.adherence,
          [event.payload.medicationId]: {
            actorName: event.actorName,
            medicationId: event.payload.medicationId,
            status: "taken",
            timestamp: event.createdAt,
          },
        },
        events,
      };
    case "MedicationScheduledEvent":
      return {
        ...state,
        events,
        medications: upsertMedication(state.medications, event.payload),
      };
    case "VitalsRecordedEvent":
      return {
        ...state,
        events,
        vitalsReadings: [...state.vitalsReadings, event.payload.reading],
      };
    case "CareNoteAddedEvent":
      return { ...state, events };
    case "MedicationMissedEvent":
      return {
        ...state,
        adherence: {
          ...state.adherence,
          [event.payload.medicationId]: {
            actorName: event.actorName,
            medicationId: event.payload.medicationId,
            status: "missed",
            timestamp: event.createdAt,
          },
        },
        events,
      };
    case "ReminderDismissedEvent":
      return { ...state, events };
  }
}

export function describeHealthEvent(event: HealthEvent, medications: Medication[]) {
  if (event.type === "MedicationTakenEvent" || event.type === "MedicationMissedEvent") {
    const medication = medications.find((item) => item.id === event.payload.medicationId);
    const action = event.type === "MedicationTakenEvent" ? "marked taken" : "marked missed";
    return `${medication?.name ?? "Medication"} ${action}`;
  }

  if (event.type === "MedicationScheduledEvent") {
    return `${event.payload.name} scheduled`;
  }

  if (event.type === "VitalsRecordedEvent") {
    return `Vitals recorded · ${event.payload.reading.bloodPressure}`;
  }

  if (event.type === "CareNoteAddedEvent") {
    return `Care note · ${event.payload.note}`;
  }

  return "Reminder dismissed";
}

export function describeActor(event: HealthEvent) {
  return `${event.actorName} · ${formatActorRole(event.actorRole)}`;
}

export function formatActorRole(role: CareActorRole) {
  if (role === "primary-caregiver") return "Primary Caregiver";
  if (role === "family-member") return "Family Member";
  if (role === "provider") return "Provider";
  return "Supporter";
}

export function projectOperationalTimeline(
  state: HealthEventState,
  query: TimelineQuery,
): TimelineItem[] {
  return state.events
    .map((event, orderIndex) => ({
      description: describeHealthEvent(event, state.medications),
      event,
      family: getEventFamily(event),
      orderIndex,
    }))
    .filter((item) => query.filter === "all" || item.family === query.filter)
    .filter((item) => isEventInTimeframe(item.event, query))
    .sort((left, right) => {
      const byTime = right.event.occurredAt.localeCompare(left.event.occurredAt);
      return byTime === 0 ? left.orderIndex - right.orderIndex : byTime;
    });
}

export function createProviderSummary(
  state: HealthEventState,
  query: TimelineQuery,
): ProviderSummary {
  const timeline = projectOperationalTimeline(state, query);
  const medicationEventCount = timeline.filter((item) => item.family === "medications").length;
  const vitalsEventCount = timeline.filter((item) => item.family === "vitals").length;
  const noteEventCount = timeline.filter((item) => item.family === "notes").length;
  const recentDescriptions = timeline
    .slice(0, 3)
    .map((item) => `${describeActor(item.event)}: ${item.description}`);

  return {
    eventCount: timeline.length,
    lines: [
      `${timeline.length} operational event${timeline.length === 1 ? "" : "s"} in ${formatTimeframeLabel(query)}.`,
      `${medicationEventCount} medication event${medicationEventCount === 1 ? "" : "s"}.`,
      `${vitalsEventCount} vitals event${vitalsEventCount === 1 ? "" : "s"}.`,
      `${noteEventCount} collaborative note${noteEventCount === 1 ? "" : "s"}.`,
      recentDescriptions.length > 0
        ? `Recent: ${recentDescriptions.join("; ")}.`
        : "No operational events in this timeframe.",
      "Summary is factual and non-diagnostic.",
    ],
    medicationEventCount,
    timeframeLabel: formatTimeframeLabel(query),
    vitalsEventCount,
  };
}

export function createDefaultCareProfile(): CareProfile {
  return {
    allergies: ["Penicillin"],
    chronicConditions: ["Hypertension", "Type 2 diabetes"],
    emergencyContacts: ["David Chen"],
    hospitalizationHistory: ["No recent hospitalization recorded"],
    insuranceInfo: "Medicare Advantage · informational only",
    medicalHistory: ["High blood pressure", "Elevated A1C history"],
    providers: ["Dr. Okafor · Cardiology", "Dr. Patel · Primary care"],
    surgicalHistory: ["Appendectomy · remote"],
  };
}

export function formatTimeframeLabel(query: TimelineQuery) {
  if (query.timeframe === "24h") return "the last 24 hours";
  if (query.timeframe === "7d") return "the last 7 days";
  if (query.timeframe === "30d") return "the last 30 days";

  return "the selected custom range";
}

function upsertMedication(medications: Medication[], medication: Medication) {
  const existing = medications.some((item) => item.id === medication.id);
  if (!existing) return [...medications, medication];

  return medications.map((item) => (item.id === medication.id ? medication : item));
}

function createEventId(prefix: string, key: string) {
  return `${prefix}-${key}-${Date.now()}`;
}

function formatEventTimestamp() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function getEventFamily(event: HealthEvent): Exclude<TimelineFilter, "all"> {
  if (event.type === "VitalsRecordedEvent") return "vitals";
  if (event.type === "CareNoteAddedEvent") return "notes";
  return "medications";
}

function createAttributionMetadata(
  actor: CareActor,
  input: EventAttributionInput,
): Pick<
  HealthEventBase<HealthEventType, unknown>,
  | "actorId"
  | "actorName"
  | "actorRole"
  | "careSubjectId"
  | "causationId"
  | "correlationId"
  | "operationalContext"
  | "schemaVersion"
> {
  return {
    actorId: actor.id,
    actorName: actor.displayName,
    actorRole: actor.role,
    careSubjectId: input.careSubjectId ?? DEFAULT_CARE_SUBJECT_ID,
    causationId: input.causationId,
    correlationId: input.correlationId ?? createEventId("correlation", actor.id),
    operationalContext: input.operationalContext ?? "care-continuity",
    schemaVersion: 1,
  };
}

function isEventInTimeframe(event: HealthEvent, query: TimelineQuery) {
  const occurredAt = new Date(event.occurredAt).getTime();
  if (Number.isNaN(occurredAt)) return true;

  if (query.timeframe === "custom" && query.customRange) {
    return (
      occurredAt >= query.customRange.start.getTime() &&
      occurredAt <= query.customRange.end.getTime()
    );
  }

  const now = Date.now();
  const timeframeMs =
    query.timeframe === "24h"
      ? 24 * 60 * 60 * 1000
      : query.timeframe === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

  return occurredAt >= now - timeframeMs;
}
