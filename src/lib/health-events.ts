export type HealthEventType =
  | "MedicationTakenEvent"
  | "MedicationScheduledEvent"
  | "VitalsRecordedEvent"
  | "CareNoteAddedEvent"
  | "CareArtifactAttachedEvent"
  | "ReminderDismissedEvent"
  | "MedicationMissedEvent";

export type HealthEventSource = "manual" | "reminder" | "device";
export type CareActorRole = "primary-caregiver" | "family-member" | "provider" | "supporter";
export type TimelineFilter = "all" | "medications" | "vitals" | "notes" | "artifacts";
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

export type CareArtifactKind =
  | "pdf"
  | "image"
  | "medication-photo"
  | "discharge-summary"
  | "insurance-card"
  | "appointment-paperwork"
  | "referral-document"
  | "other-care-record";

export type CareArtifact = {
  fileLabel: string;
  id: string;
  kind: CareArtifactKind;
  linkedContext: string;
  previewLabel: string;
  summaryVisible: boolean;
  title: string;
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
      "symptom-observation" | "caregiver-context" | "recovery-observation" | "operational-concern";
  }
>;

export type CareArtifactAttachedEvent = HealthEventBase<
  "CareArtifactAttachedEvent",
  {
    artifact: CareArtifact;
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
  | CareArtifactAttachedEvent
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
  artifacts: CareArtifact[];
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
  artifactEventCount: number;
  continuitySignalCount: number;
  eventCount: number;
  lines: string[];
  medicationEventCount: number;
  timeframeLabel: string;
  vitalsEventCount: number;
};

export type ProviderSummaryExport = {
  sections: {
    lines: string[];
    title: string;
  }[];
  title: string;
};

export type CaregiverWorkflowStatus = {
  detail: string;
  id: string;
  nextStep: string;
  status: "ready" | "review" | "pending";
  title: string;
};

export type BetaWorkflowMetric = {
  detail: string;
  label: string;
  value: string;
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

export type ContinuitySignalKind =
  | "medication-gap"
  | "vitals-gap"
  | "care-observation"
  | "artifact-follow-up"
  | "circle-participation";

export type ContinuitySignal = {
  detail: string;
  id: string;
  kind: ContinuitySignalKind;
  sourceEventId?: string;
  timeframeLabel: string;
  title: string;
  tone: "steady" | "watch" | "follow-up";
};

const DEFAULT_ACTOR = "Maya";
const DEFAULT_CARE_SUBJECT_ID = "evelyn-demo-workspace";

export const DEFAULT_CARE_ACTORS: CareActor[] = [
  {
    displayName: "Maya",
    id: "actor-maya-demo",
    relationship: "Primary family organizer",
    role: "primary-caregiver",
  },
  {
    displayName: "Jordan",
    id: "actor-jordan-demo",
    relationship: "Secondary family helper",
    role: "family-member",
  },
  {
    displayName: "Sam",
    id: "actor-sam-demo",
    relationship: "Weekend support",
    role: "supporter",
  },
];

export const DEFAULT_CARE_CIRCLE: CareCircle = {
  actors: DEFAULT_CARE_ACTORS,
  careSubject: {
    displayName: "Evelyn",
    id: DEFAULT_CARE_SUBJECT_ID,
    relationshipContext: "Family care demo",
  },
  id: "circle-evelyn-demo-workspace",
  name: "Evelyn's family care team",
};

export function createInitialHealthEventState(): HealthEventState {
  return {
    adherence: {
      morningMedication: {
        actorName: DEFAULT_ACTOR,
        medicationId: "morningMedication",
        status: "taken",
        timestamp: "Today, 8:14 AM",
      },
    },
    artifacts: [
      {
        fileLabel: "Vault placeholder",
        id: "artifact-vault-placeholder",
        kind: "other-care-record",
        linkedContext: "Care timeline placeholder",
        previewLabel: "Placeholder",
        summaryVisible: true,
        title: "Care artifact placeholder",
      },
    ],
    careCircle: DEFAULT_CARE_CIRCLE,
    events: [
      createCareArtifactAttachedEvent({
        actor: DEFAULT_CARE_ACTORS[0],
        artifact: {
          fileLabel: "Vault placeholder",
          id: "artifact-vault-placeholder",
          kind: "other-care-record",
          linkedContext: "Care timeline placeholder",
          previewLabel: "Placeholder",
          summaryVisible: true,
          title: "Care artifact placeholder",
        },
        createdAt: "Today, 9:10 AM",
        eventId: "event-artifact-vault-placeholder",
        occurredAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      }),
      createMedicationTakenEvent({
        actor: DEFAULT_CARE_ACTORS[0],
        createdAt: "Today, 8:14 AM",
        eventId: "event-med-morning-check-taken",
        medicationId: "morningMedication",
        occurredAt: new Date().toISOString(),
      }),
      createCareNoteAddedEvent({
        actor: DEFAULT_CARE_ACTORS[1],
        createdAt: "Yesterday, 6:20 PM",
        note: "Evening handoff note added for tomorrow's family check-in.",
        noteType: "caregiver-context",
        occurredAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      }),
    ],
    medications: [
      {
        dose: "Hidden in beta preview",
        frequency: "Cadence hidden",
        id: "morningMedication",
        name: "Morning routine status",
        reminderTime: "Hidden",
      },
      {
        dose: "Hidden in beta preview",
        frequency: "Cadence hidden",
        id: "middayMedication",
        name: "Midday comfort status",
        reminderTime: "Hidden",
      },
      {
        dose: "Hidden in beta preview",
        frequency: "Cadence hidden",
        id: "eveningMedication",
        name: "Evening handoff status",
        reminderTime: "Hidden",
      },
    ],
    vitalsReadings: [
      createVitalsReading("Morning check-in", 0, 0, "Hidden", "Evelyn felt settled this morning."),
      createVitalsReading(
        "Afternoon check-in",
        0,
        0,
        "Hidden",
        "Jordan added a short comfort update.",
      ),
      createVitalsReading(
        "Evening check-in",
        0,
        0,
        "Hidden",
        "Sam prepared the next handoff note.",
      ),
    ],
  };
}

export function createEmptyHealthEventState(): HealthEventState {
  return {
    adherence: {},
    artifacts: [],
    careCircle: {
      actors: [],
      careSubject: {
        displayName: "Care recipient",
        id: "active-care-recipient",
        relationshipContext: "Family care workspace",
      },
      id: "active-care-circle",
      name: "Family care team",
    },
    events: [],
    medications: [],
    vitalsReadings: [],
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
  eventId,
  medication,
  occurredAt = new Date().toISOString(),
  operationalContext = "medication-schedule",
}: {
  actor?: CareActor;
  careSubjectId?: string;
  causationId?: string;
  correlationId?: string;
  createdAt?: string;
  eventId?: string;
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
    id: eventId ?? createEventId("medication-scheduled", medication.id),
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
  eventId,
  occurredAt = new Date().toISOString(),
  operationalContext = "vitals-recording",
  reading,
}: {
  actor?: CareActor;
  careSubjectId?: string;
  causationId?: string;
  correlationId?: string;
  createdAt?: string;
  eventId?: string;
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
    id: eventId ?? createEventId("vitals-recorded", reading.id),
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

export function createCareArtifactAttachedEvent({
  actor = DEFAULT_CARE_ACTORS[0],
  artifact,
  careSubjectId,
  causationId,
  correlationId,
  createdAt = formatEventTimestamp(),
  eventId,
  occurredAt = new Date().toISOString(),
  operationalContext = "care-artifact",
}: EventAttributionInput & {
  artifact: CareArtifact;
  createdAt?: string;
  eventId?: string;
  occurredAt?: string;
}): CareArtifactAttachedEvent {
  return {
    ...createAttributionMetadata(actor, {
      careSubjectId,
      causationId,
      correlationId,
      operationalContext,
    }),
    createdAt,
    id: eventId ?? createEventId("care-artifact", artifact.id),
    occurredAt,
    payload: { artifact },
    source: "manual",
    type: "CareArtifactAttachedEvent",
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
    bloodPressure: systolic > 0 ? `${systolic}/78` : "Hidden",
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
    case "CareArtifactAttachedEvent":
      return {
        ...state,
        artifacts: upsertArtifact(state.artifacts, event.payload.artifact),
        events,
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

export function mergeHealthEventsIntoState(
  state: HealthEventState,
  incomingEvents: HealthEvent[],
): HealthEventState {
  const existingEventIds = new Set(state.events.map((event) => event.id));
  const newEvents = incomingEvents
    .filter((event) => !existingEventIds.has(event.id))
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

  return newEvents.reduce(healthEventReducer, state);
}

export function describeHealthEvent(event: HealthEvent, medications: Medication[]) {
  if (event.type === "MedicationTakenEvent" || event.type === "MedicationMissedEvent") {
    const medication = medications.find((item) => item.id === event.payload.medicationId);
    const label = medication?.name ?? "Care status";
    const action = event.type === "MedicationTakenEvent" ? "reviewed" : "needs family review";
    return `${label} ${action}`;
  }

  if (event.type === "MedicationScheduledEvent") {
    return "Care status category added for Evelyn";
  }

  if (event.type === "VitalsRecordedEvent") {
    return "Family check-in added";
  }

  if (event.type === "CareNoteAddedEvent") {
    return "Care note recorded";
  }

  if (event.type === "CareArtifactAttachedEvent") {
    return "Vault placeholder linked";
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
  const timeline = projectOperationalTimeline(state, query).filter(
    (item) => item.family !== "notes",
  );
  const continuitySignals = projectContinuitySignals(state, query);
  const medicationEventCount = timeline.filter((item) => item.family === "medications").length;
  const vitalsEventCount = timeline.filter((item) => item.family === "vitals").length;
  const artifactEventCount = timeline.filter((item) => item.family === "artifacts").length;
  const recentDescriptions = timeline
    .slice(0, 3)
    .map((item) => `${describeActor(item.event)}: ${item.description}`);

  return {
    artifactEventCount,
    continuitySignalCount: continuitySignals.length,
    eventCount: timeline.length,
    lines: [
      `${timeline.length} care update${timeline.length === 1 ? "" : "s"} in ${formatTimeframeLabel(query)}.`,
      `${medicationEventCount} family care status update${medicationEventCount === 1 ? "" : "s"}.`,
      `${vitalsEventCount} comfort check-in update${vitalsEventCount === 1 ? "" : "s"}.`,
      "Care notes stay in Recent Updates for this beta preview.",
      `${artifactEventCount} Vault placeholder${artifactEventCount === 1 ? "" : "s"} referenced.`,
      `${continuitySignals.length} thing${continuitySignals.length === 1 ? "" : "s"} to review.`,
      continuitySignals.length > 0
        ? `Mention first: ${continuitySignals
            .slice(0, 2)
            .map((signal) => signal.title)
            .join("; ")}.`
        : "No care gaps surfaced for this timeframe.",
      recentDescriptions.length > 0
        ? `${recentDescriptions.length} recent safe update${recentDescriptions.length === 1 ? "" : "s"} available.`
        : "No recent care updates in this timeframe.",
      "For in-app coordination only.",
    ],
    medicationEventCount,
    timeframeLabel: formatTimeframeLabel(query),
    vitalsEventCount,
  };
}

export function projectContinuitySignals(
  state: HealthEventState,
  query: TimelineQuery,
): ContinuitySignal[] {
  const timeline = projectOperationalTimeline(state, query).filter(
    (item) => item.family !== "notes",
  );
  const timeframeLabel = formatTimeframeLabel(query);
  const signals: ContinuitySignal[] = [];
  const medicationEvents = timeline.filter((item) => item.family === "medications");
  const vitalsEvents = timeline.filter((item) => item.family === "vitals");
  const artifactEvents = timeline.filter((item) => item.event.type === "CareArtifactAttachedEvent");

  const medicationsWithoutRecentTaken = state.medications.filter(
    (medication) =>
      !medicationEvents.some(
        (item) =>
          item.event.type === "MedicationTakenEvent" &&
          item.event.payload.medicationId === medication.id,
      ),
  );

  if (medicationsWithoutRecentTaken.length > 0) {
    signals.push({
      detail: `${medicationsWithoutRecentTaken.length} family care categor${medicationsWithoutRecentTaken.length === 1 ? "y" : "ies"} need review in ${timeframeLabel}.`,
      id: `signal-medication-gap-${query.timeframe}`,
      kind: "medication-gap",
      timeframeLabel,
      title: "Family care review",
      tone: "follow-up",
    });
  }

  if (vitalsEvents.length === 0) {
    signals.push({
      detail: `No comfort check-in has been added in ${timeframeLabel}.`,
      id: `signal-vitals-gap-${query.timeframe}`,
      kind: "vitals-gap",
      timeframeLabel,
      title: "Comfort check-in missing",
      tone: "watch",
    });
  }

  const hasVaultPlaceholder = artifactEvents.some(
    (item) => item.event.type === "CareArtifactAttachedEvent",
  );

  if (hasVaultPlaceholder) {
    const artifactEvent = artifactEvents.find(
      (item) => item.event.type === "CareArtifactAttachedEvent",
    );
    signals.push({
      detail: "A Vault placeholder is linked; content stays hidden in beta.",
      id: `signal-artifact-follow-up-${query.timeframe}`,
      kind: "artifact-follow-up",
      sourceEventId: artifactEvent?.event.id,
      timeframeLabel,
      title: "Vault placeholder linked",
      tone: "steady",
    });
  }

  const activeActorIds = new Set(timeline.map((item) => item.event.actorId));
  if (activeActorIds.size < state.careCircle.actors.length) {
    signals.push({
      detail: `${activeActorIds.size} of ${state.careCircle.actors.length} care team members added an update in ${timeframeLabel}.`,
      id: `signal-circle-participation-${query.timeframe}`,
      kind: "circle-participation",
      timeframeLabel,
      title: "Care team participation visibility",
      tone: "steady",
    });
  }

  return signals;
}

export function createProviderSummaryExport({
  artifacts,
  careProfile,
  signals = [],
  summary,
}: {
  artifacts: CareArtifact[];
  careProfile: CareProfile;
  signals?: ContinuitySignal[];
  summary: ProviderSummary;
}): ProviderSummaryExport {
  const visibleArtifacts = artifacts.filter((artifact) => artifact.summaryVisible);

  return {
    sections: [
      {
        lines: [
          `${summary.eventCount} update${summary.eventCount === 1 ? "" : "s"} · ${summary.continuitySignalCount} thing${summary.continuitySignalCount === 1 ? "" : "s"} to review · ${summary.artifactEventCount} Vault placeholder${summary.artifactEventCount === 1 ? "" : "s"}.`,
          signals.length > 0
            ? `Review first: ${signals
                .slice(0, 2)
                .map((signal) => signal.title)
                .join("; ")}.`
            : "Nothing needs review for this summary.",
        ],
        title: "Internal visit view",
      },
      {
        lines: summary.lines,
        title: "Care summary",
      },
      {
        lines: [
          `Care categories: ${careProfile.chronicConditions.length}`,
          `Safety notes: ${careProfile.allergies.length}`,
          `Workspace contacts: ${careProfile.providers.length}`,
        ],
        title: "Background profile",
      },
      {
        lines:
          visibleArtifacts.length > 0
            ? visibleArtifacts.map(() => "Vault placeholder · content hidden in beta")
            : ["No Vault placeholders marked for this view."],
        title: "Vault placeholders",
      },
    ],
    title: "Evernest Care continuity snapshot",
  };
}

export function projectCaregiverWorkflows(
  state: HealthEventState,
  query: TimelineQuery,
): CaregiverWorkflowStatus[] {
  const timeline = projectOperationalTimeline(state, query).filter(
    (item) => item.family !== "notes",
  );
  const signals = projectContinuitySignals(state, query);
  const hasMedicationGap = signals.some((signal) => signal.kind === "medication-gap");
  const hasVitalsGap = signals.some((signal) => signal.kind === "vitals-gap");
  const hasVaultPlaceholder = state.artifacts.length > 0;
  const hasSummaryArtifact = state.artifacts.some((artifact) => artifact.summaryVisible);
  const activeActorCount = new Set(timeline.map((item) => item.event.actorId)).size;

  return [
    {
      detail: hasMedicationGap
        ? "Evelyn's care categories need family review for this view."
        : "Evelyn's care status updates are visible in this view.",
      id: "workflow-medication",
      nextStep: hasMedicationGap ? "Review family status" : "Review history",
      status: hasMedicationGap ? "review" : "ready",
      title: "Care status",
    },
    {
      detail:
        hasSummaryArtifact && !hasVitalsGap
          ? "Evelyn's family check-in prep and recent care updates are ready to review."
          : "Family check-in prep is available with a few care items to review.",
      id: "workflow-visit-prep",
      nextStep: "Review care prep",
      status: hasSummaryArtifact && !hasVitalsGap ? "ready" : "review",
      title: "Care prep",
    },
    {
      detail: hasVaultPlaceholder
        ? "A Vault placeholder is linked to the timeline."
        : "No Vault placeholder is linked yet.",
      id: "workflow-vault-placeholder",
      nextStep: hasVaultPlaceholder ? "Review placeholder status" : "Open Vault",
      status: hasVaultPlaceholder ? "review" : "pending",
      title: "Vault continuity",
    },
    {
      detail: `${activeActorCount} care team member${activeActorCount === 1 ? "" : "s"} contributed in ${formatTimeframeLabel(query)}.`,
      id: "workflow-collaboration",
      nextStep: activeActorCount > 1 ? "Scan timeline" : "Invite or nudge helper",
      status: activeActorCount > 1 ? "ready" : "pending",
      title: "Collaborative caregiving",
    },
  ];
}

export function projectBetaWorkflowMetrics(
  state: HealthEventState,
  query: TimelineQuery,
): BetaWorkflowMetric[] {
  const timeline = projectOperationalTimeline(state, query).filter(
    (item) => item.family !== "notes",
  );
  const signals = projectContinuitySignals(state, query);
  const activeActorCount = new Set(timeline.map((item) => item.event.actorId)).size;

  return [
    {
      detail: "Recent care updates stay consistent across Home, summaries, and the timeline.",
      label: "Care history",
      value: `${timeline.length} updates`,
    },
    {
      detail: "Vault placeholders stay content-free in beta readiness checks.",
      label: "Vault readiness",
      value: `${state.artifacts.filter((artifact) => artifact.summaryVisible).length} placeholders`,
    },
    {
      detail: "Care team participation is visible without adding extra noise.",
      label: "Collaboration",
      value: `${activeActorCount}/${state.careCircle.actors.length} active`,
    },
    {
      detail: "Care gaps stay explainable and focused on coordination.",
      label: "Continuity confidence",
      value: `${signals.length} items`,
    },
  ];
}

export function createDefaultCareProfile(): CareProfile {
  return {
    allergies: ["Safety note category"],
    chronicConditions: ["Care category"],
    emergencyContacts: ["Backup helper"],
    hospitalizationHistory: ["History details hidden in beta"],
    insuranceInfo: "Coverage details hidden in beta",
    medicalHistory: ["History category"],
    providers: ["Workspace contact"],
    surgicalHistory: ["Procedure details hidden in beta"],
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

function upsertArtifact(artifacts: CareArtifact[], artifact: CareArtifact) {
  const existing = artifacts.some((item) => item.id === artifact.id);
  if (!existing) return [...artifacts, artifact];

  return artifacts.map((item) => (item.id === artifact.id ? artifact : item));
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
  if (event.type === "CareArtifactAttachedEvent") return "artifacts";
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
