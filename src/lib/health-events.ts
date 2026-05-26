export type HealthEventType =
  | "MedicationTakenEvent"
  | "MedicationScheduledEvent"
  | "VitalsRecordedEvent"
  | "ReminderDismissedEvent"
  | "MedicationMissedEvent";

export type HealthEventSource = "manual" | "reminder" | "device";
export type TimelineFilter = "all" | "medications" | "vitals";
export type TimeframePreset = "24h" | "7d" | "30d" | "custom";

export type HealthEventBase<TType extends HealthEventType, TPayload> = {
  actorName: string;
  createdAt: string;
  id: string;
  occurredAt: string;
  payload: TPayload;
  source: HealthEventSource;
  type: TType;
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
    events: [
      createMedicationTakenEvent({
        actorName: "Sarah",
        createdAt: "Today, 8:14 AM",
        eventId: "event-med-lisinopril-taken",
        medicationId: "lisinopril",
        occurredAt: new Date().toISOString(),
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
  actorName = DEFAULT_ACTOR,
  createdAt = formatEventTimestamp(),
  eventId,
  medicationId,
  occurredAt = new Date().toISOString(),
}: {
  actorName?: string;
  createdAt?: string;
  eventId?: string;
  medicationId: string;
  occurredAt?: string;
}): MedicationTakenEvent {
  return {
    actorName,
    createdAt,
    id: eventId ?? createEventId("medication-taken", medicationId),
    occurredAt,
    payload: { medicationId },
    source: "manual",
    type: "MedicationTakenEvent",
  };
}

export function createMedicationScheduledEvent({
  actorName = DEFAULT_ACTOR,
  createdAt = formatEventTimestamp(),
  medication,
  occurredAt = new Date().toISOString(),
}: {
  actorName?: string;
  createdAt?: string;
  medication: Medication;
  occurredAt?: string;
}): MedicationScheduledEvent {
  return {
    actorName,
    createdAt,
    id: createEventId("medication-scheduled", medication.id),
    occurredAt,
    payload: medication,
    source: "manual",
    type: "MedicationScheduledEvent",
  };
}

export function createVitalsRecordedEvent({
  actorName = DEFAULT_ACTOR,
  createdAt = formatEventTimestamp(),
  occurredAt = new Date().toISOString(),
  reading,
}: {
  actorName?: string;
  createdAt?: string;
  occurredAt?: string;
  reading: VitalsReading;
}): VitalsRecordedEvent {
  return {
    actorName,
    createdAt,
    id: createEventId("vitals-recorded", reading.id),
    occurredAt,
    payload: { reading: { ...reading, recordedAt: createdAt } },
    source: "manual",
    type: "VitalsRecordedEvent",
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

  return "Reminder dismissed";
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
  const recentDescriptions = timeline.slice(0, 3).map((item) => item.description);

  return {
    eventCount: timeline.length,
    lines: [
      `${timeline.length} operational event${timeline.length === 1 ? "" : "s"} in ${formatTimeframeLabel(query)}.`,
      `${medicationEventCount} medication event${medicationEventCount === 1 ? "" : "s"}.`,
      `${vitalsEventCount} vitals event${vitalsEventCount === 1 ? "" : "s"}.`,
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
  return "medications";
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
