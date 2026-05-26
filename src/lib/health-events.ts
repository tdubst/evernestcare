export type HealthEventType =
  | "MedicationTakenEvent"
  | "MedicationScheduledEvent"
  | "VitalsRecordedEvent"
  | "ReminderDismissedEvent"
  | "MedicationMissedEvent";

export type HealthEventSource = "manual" | "reminder" | "device";

export type HealthEventBase<TType extends HealthEventType, TPayload> = {
  actorName: string;
  createdAt: string;
  id: string;
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
}: {
  actorName?: string;
  createdAt?: string;
  eventId?: string;
  medicationId: string;
}): MedicationTakenEvent {
  return {
    actorName,
    createdAt,
    id: eventId ?? createEventId("medication-taken", medicationId),
    payload: { medicationId },
    source: "manual",
    type: "MedicationTakenEvent",
  };
}

export function createMedicationScheduledEvent({
  actorName = DEFAULT_ACTOR,
  createdAt = formatEventTimestamp(),
  medication,
}: {
  actorName?: string;
  createdAt?: string;
  medication: Medication;
}): MedicationScheduledEvent {
  return {
    actorName,
    createdAt,
    id: createEventId("medication-scheduled", medication.id),
    payload: medication,
    source: "manual",
    type: "MedicationScheduledEvent",
  };
}

export function createVitalsRecordedEvent({
  actorName = DEFAULT_ACTOR,
  createdAt = formatEventTimestamp(),
  reading,
}: {
  actorName?: string;
  createdAt?: string;
  reading: VitalsReading;
}): VitalsRecordedEvent {
  return {
    actorName,
    createdAt,
    id: createEventId("vitals-recorded", reading.id),
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
