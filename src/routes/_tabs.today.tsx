import { createFileRoute, Link } from "@tanstack/react-router";
import { useReducer, useState } from "react";
import {
  type LucideIcon,
  Pill,
  CalendarDays,
  AlertCircle,
  Activity,
  ScanLine,
  Phone,
  Heart,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  X,
  Plus,
  Clock3,
  Bluetooth,
  Watch,
  Smartphone,
  FileText,
  Share2,
  Upload,
} from "lucide-react";

import { HEALTH_DEVICE_INTEGRATIONS } from "@/lib/integrations/health-devices";
import {
  createCareNoteAddedEvent,
  createCareArtifactAttachedEvent,
  createInitialHealthEventState,
  createMedicationScheduledEvent,
  createMedicationTakenEvent,
  createVitalsReading,
  createVitalsRecordedEvent,
  describeActor,
  describeHealthEvent,
  formatActorRole,
  healthEventReducer,
  type HealthEvent,
  type HealthEventState,
  type CareArtifact,
  type CareProfile,
  type CareCircle,
  type Medication,
  type ProviderSummary,
  type TimelineFilter,
  type TimelineItem,
  type TimeframePreset,
  type VitalsReading,
  createDefaultCareProfile,
  createProviderSummary,
  createProviderSummaryExport,
  formatTimeframeLabel,
  projectOperationalTimeline,
} from "@/lib/health-events";

export const Route = createFileRoute("/_tabs/today")({
  head: () => ({ meta: [{ title: "Today — EvernestCare" }] }),
  component: Today,
});

function Today() {
  const [quickPanel, setQuickPanel] = useState<"med" | "vitals" | null>(null);
  const [savedPanel, setSavedPanel] = useState<"med" | "vitals" | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [timeframe, setTimeframe] = useState<TimeframePreset>("7d");
  const [healthEventState, dispatchHealthEvent] = useReducer(
    healthEventReducer,
    undefined,
    createInitialHealthEventState,
  );
  const timelineQuery = { filter: timelineFilter, timeframe };
  const timeline = projectOperationalTimeline(healthEventState, timelineQuery);
  const providerSummary = createProviderSummary(healthEventState, timelineQuery);
  const careProfile = createDefaultCareProfile();
  const providerSummaryExport = createProviderSummaryExport({
    artifacts: healthEventState.artifacts,
    careProfile,
    summary: providerSummary,
  });
  const careCircle = healthEventState.careCircle;
  const addCollaborativeNote = () => {
    dispatchHealthEvent(
      createCareNoteAddedEvent({
        actor: careCircle.actors[1],
        note: "Shared observation: Margaret was more tired than usual after lunch but comfortable after resting.",
        noteType: "caregiver-context",
      }),
    );
  };
  const attachCareArtifact = () => {
    dispatchHealthEvent(
      createCareArtifactAttachedEvent({
        actor: careCircle.actors[0],
        artifact: {
          fileLabel: "medication-list-photo.jpg",
          id: "artifact-medication-list-photo",
          kind: "medication-photo",
          linkedContext: "Medication reconciliation",
          previewLabel: "Image placeholder",
          summaryVisible: true,
          title: "Medication list photo",
        },
      }),
    );
  };

  const openQuickPanel = (panel: "med" | "vitals") => {
    setQuickPanel(panel);
    setSavedPanel(null);
  };

  const closeQuickPanel = () => {
    setQuickPanel(null);
    setSavedPanel(null);
  };

  return (
    <div>
      {/* Header */}
      <header className="px-6 pt-14 pb-4">
        <p className="text-[13px] font-medium text-muted-foreground">Tuesday, May 26</p>
        <h1 className="mt-1 text-[30px] font-semibold tracking-tight">Good morning, Sarah</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Here's what matters for Mom today.</p>
      </header>

      {/* Care recipient bar */}
      <div className="px-6">
        <div className="flex items-center gap-3 card-soft px-4 py-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blush text-blush-foreground text-[14px] font-semibold">
            MC
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">Margaret Chen</p>
            <p className="text-[12px] text-muted-foreground">82 · Older adult care · 4 in circle</p>
          </div>
          <button className="text-[12px] font-medium text-primary">Switch</button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-6 mt-5 grid grid-cols-4 gap-2.5">
        {[
          {
            i: Pill,
            l: "Medications",
            c: "bg-blush text-blush-foreground",
            onClick: () => openQuickPanel("med"),
          },
          {
            i: Activity,
            l: "Vitals",
            c: "bg-sage text-sage-foreground",
            onClick: () => openQuickPanel("vitals"),
          },
          { i: ScanLine, l: "Scan doc", c: "bg-sky text-sky-foreground" },
          { i: Phone, l: "Call", c: "bg-sand text-sand-foreground" },
        ].map(({ i: Icon, l, c, onClick }) => (
          <button key={l} onClick={onClick} className="flex flex-col items-center gap-1.5">
            <span
              className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${c} shadow-soft`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-foreground">{l}</span>
          </button>
        ))}
      </div>

      {quickPanel && (
        <div className="px-6 mt-4">
          {quickPanel === "med" ? (
            <LogMedicationPanel
              healthEventState={healthEventState}
              saved={savedPanel === "med"}
              onEvent={dispatchHealthEvent}
              onClose={closeQuickPanel}
              onSave={() => setSavedPanel("med")}
            />
          ) : (
            <VitalsPanel
              healthEventState={healthEventState}
              saved={savedPanel === "vitals"}
              onEvent={dispatchHealthEvent}
              onClose={closeQuickPanel}
              onSave={() => setSavedPanel("vitals")}
            />
          )}
        </div>
      )}

      <Section title="Needs attention">
        <Alert
          tone="warn"
          icon={AlertCircle}
          title="Evening Metformin missed"
          subtitle="Yesterday, 8:00 PM · 500 mg"
          action="Mark taken"
        />
        <Alert
          tone="info"
          icon={ScanLine}
          title="MRI follow-up in 3 days"
          subtitle="Dr. Patel · Neurology · Bring imaging"
          action="Prep visit"
        />
      </Section>

      <Section title="Today's schedule">
        <div className="card-soft divide-y hairline overflow-hidden">
          <Row
            time="9:00 AM"
            icon={Pill}
            iconBg="bg-blush text-blush-foreground"
            title="Lisinopril · 10 mg"
            sub="Taken at 8:14 AM"
            done
          />
          <Row
            time="11:30 AM"
            icon={CalendarDays}
            iconBg="bg-sky text-sky-foreground"
            title="Cardiology — Dr. Okafor"
            sub="Mercy Heart Clinic · David driving"
          />
          <Row
            time="1:00 PM"
            icon={Pill}
            iconBg="bg-blush text-blush-foreground"
            title="Metformin · 500 mg"
            sub="With lunch"
          />
          <Row
            time="3:00 PM"
            icon={Heart}
            iconBg="bg-sage text-sage-foreground"
            title="Physical therapy"
            sub="Home visit · 45 min"
          />
        </div>
      </Section>

      <Section title="Recent updates">
        <div className="space-y-3">
          <UpdateCard
            who="Dr. Okafor"
            role="Cardiologist"
            time="2h ago"
            body="BP trending in target range. Continue current medications. Re-check in 4 weeks."
            chip={{ label: "Provider note", tone: "sky" }}
          />
          <UpdateCard
            who="David"
            role="Brother"
            time="Yesterday"
            body="Picked up new prescription — left it on the kitchen counter."
            chip={{ label: "Family", tone: "sage" }}
          />
        </div>
      </Section>

      <Section title="Care circle">
        <CareCircleCard careCircle={careCircle} />
      </Section>

      <Section title="Care artifacts">
        <CareArtifactsCard
          artifacts={healthEventState.artifacts}
          events={healthEventState.events}
          onAttachArtifact={attachCareArtifact}
        />
      </Section>

      <Section title="Vitals snapshot">
        <div className="grid grid-cols-3 gap-2.5">
          <Vital label="Blood pressure" value="124/78" trend="Steady" tone="sage" />
          <Vital label="Heart rate" value="72" trend="Resting" tone="sky" />
          <Vital label="Weight" value="148 lb" trend="-1.2 this wk" tone="sand" />
        </div>
        <p className="mt-2.5 px-1 text-[11px] text-muted-foreground">
          Logged manually · EvernestCare does not diagnose or interpret.
        </p>
      </Section>

      <Section title="Operational timeline">
        <OperationalTimelineCard
          careCircle={careCircle}
          filter={timelineFilter}
          onAddNote={addCollaborativeNote}
          onFilterChange={setTimelineFilter}
          onTimeframeChange={setTimeframe}
          summary={providerSummary}
          timeframe={timeframe}
          timeline={timeline}
        />
      </Section>

      <Section title="Provider summary">
        <ProviderSummaryCard
          careProfile={careProfile}
          exportSnapshot={providerSummaryExport}
          summary={providerSummary}
          timeframe={timeframe}
        />
      </Section>

      <Section
        title="Emergency contacts"
        cta={
          <Link to="/care-team" className="text-[13px] font-medium text-primary">
            Manage
          </Link>
        }
      >
        <div className="card-soft divide-y hairline overflow-hidden">
          {[
            { n: "David Chen", r: "Primary · Brother", p: "(415) 555-0123" },
            { n: "Dr. Patel", r: "Primary care", p: "(415) 555-0199" },
          ].map((c) => (
            <div key={c.n} className="flex items-center gap-3 px-4 py-3.5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blush text-blush-foreground text-[12px] font-semibold">
                {c.n
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-medium">{c.n}</p>
                <p className="text-[12px] text-muted-foreground">{c.r}</p>
              </div>
              <a
                href={`tel:${c.p}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sage text-sage-foreground"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </Section>

      <div className="px-6 mt-6">
        <Link
          to="/profile-types"
          className="flex items-center justify-between card-soft px-5 py-4 grad-warm"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card">
              <Sparkles className="h-4 w-4 text-primary" />
            </span>
            <div>
              <p className="text-[14px] font-medium">Care for more than one person?</p>
              <p className="text-[12px] text-muted-foreground">
                Add a child, recovery, or chronic profile.
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}

function OperationalTimelineCard({
  careCircle,
  filter,
  onAddNote,
  onFilterChange,
  onTimeframeChange,
  summary,
  timeframe,
  timeline,
}: {
  careCircle: CareCircle;
  filter: TimelineFilter;
  onAddNote: () => void;
  onFilterChange: (filter: TimelineFilter) => void;
  onTimeframeChange: (timeframe: TimeframePreset) => void;
  summary: ProviderSummary;
  timeframe: TimeframePreset;
  timeline: TimelineItem[];
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Care activity</p>
          <p className="text-[12px] text-muted-foreground">
            {summary.eventCount} event{summary.eventCount === 1 ? "" : "s"} in{" "}
            {formatTimeframeLabel({ filter, timeframe })}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {careCircle.careSubject.displayName}
        </span>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[
          { label: "24h", value: "24h" },
          { label: "7d", value: "7d" },
          { label: "30d", value: "30d" },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => onTimeframeChange(option.value as TimeframePreset)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
              timeframe === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {[
          { label: "All", value: "all" },
          { label: "Meds", value: "medications" },
          { label: "Vitals", value: "vitals" },
          { label: "Notes", value: "notes" },
          { label: "Files", value: "artifacts" },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value as TimelineFilter)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
              filter === option.value
                ? "bg-sage text-sage-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        onClick={onAddNote}
        className="mt-3 w-full rounded-full bg-secondary py-2.5 text-[13px] font-medium text-primary"
      >
        Add caregiver note
      </button>

      <div className="mt-3 space-y-2.5">
        {timeline.slice(0, 4).map((item) => (
          <div key={item.event.id} className="flex gap-3 rounded-2xl bg-secondary px-3.5 py-3">
            <span
              className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                item.family === "medications"
                  ? "bg-blush-foreground"
                  : item.family === "artifacts"
                    ? "bg-sky-foreground"
                    : "bg-sage-foreground"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{item.description}</p>
              <p className="text-[12px] text-muted-foreground">
                {describeActor(item.event)} · {item.event.createdAt}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.event.type} · {item.event.operationalContext}
              </p>
            </div>
          </div>
        ))}
        {timeline.length === 0 && (
          <div className="rounded-2xl bg-secondary px-3.5 py-3 text-[13px] text-muted-foreground">
            No operational events match this view.
          </div>
        )}
      </div>
    </div>
  );
}

function CareArtifactsCard({
  artifacts,
  events,
  onAttachArtifact,
}: {
  artifacts: CareArtifact[];
  events: HealthEvent[];
  onAttachArtifact: () => void;
}) {
  const artifactEvents = events.filter((event) => event.type === "CareArtifactAttachedEvent");

  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Continuity documents</p>
          <p className="text-[12px] text-muted-foreground">
            Timeline-linked attachments for visits and handoffs.
          </p>
        </div>
        <button
          onClick={onAttachArtifact}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label="Attach care artifact"
        >
          <Upload className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        {artifacts.map((artifact) => {
          const event = artifactEvents.find((item) => item.payload.artifact.id === artifact.id);
          return (
            <div key={artifact.id} className="flex gap-3 rounded-2xl bg-secondary px-3.5 py-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky text-sky-foreground">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{artifact.title}</p>
                <p className="text-[12px] text-muted-foreground">
                  {artifact.previewLabel} · {artifact.linkedContext}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {event ? `${describeActor(event)} · ${event.createdAt}` : artifact.fileLabel}
                </p>
              </div>
              {artifact.summaryVisible && (
                <span className="self-start rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Summary
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Uploads are placeholders in alpha. Each attachment is represented as a replay-safe
        operational event before storage is connected.
      </p>
    </div>
  );
}

function CareCircleCard({ careCircle }: { careCircle: CareCircle }) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">{careCircle.name}</p>
          <p className="text-[12px] text-muted-foreground">
            Centered on {careCircle.careSubject.displayName}
          </p>
        </div>
        <span className="rounded-full bg-sage px-2.5 py-1 text-[11px] font-medium text-sage-foreground">
          Shared
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {careCircle.actors.map((actor) => (
          <div key={actor.id} className="rounded-2xl bg-secondary px-3.5 py-3">
            <p className="text-[13px] font-medium">{actor.displayName}</p>
            <p className="text-[11px] text-muted-foreground">
              {actor.relationship} · {formatActorRole(actor.role)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderSummaryCard({
  careProfile,
  exportSnapshot,
  summary,
  timeframe,
}: {
  careProfile: CareProfile;
  exportSnapshot: ReturnType<typeof createProviderSummaryExport>;
  summary: ProviderSummary;
  timeframe: TimeframePreset;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Visit-ready summary</p>
          <p className="text-[12px] text-muted-foreground">
            Deterministic · {formatTimeframeLabel({ filter: "all", timeframe })}
          </p>
        </div>
        <span className="rounded-full bg-sky px-2.5 py-1 text-[11px] font-medium text-sky-foreground">
          Factual
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {summary.lines.map((line) => (
          <p key={line} className="rounded-2xl bg-secondary px-3.5 py-2.5 text-[13px]">
            {line}
          </p>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <ProfileChip label="Conditions" value={careProfile.chronicConditions.join(", ")} />
        <ProfileChip label="Allergies" value={careProfile.allergies.join(", ")} />
      </div>

      <div className="mt-3 rounded-2xl bg-secondary p-3.5">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <p className="text-[13px] font-semibold">{exportSnapshot.title}</p>
        </div>
        <div className="mt-3 space-y-2">
          {exportSnapshot.sections.map((section) => (
            <div key={section.title} className="rounded-2xl bg-card px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed">
                {section.lines.slice(0, 2).join(" ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-medium">{value}</p>
    </div>
  );
}

function LogMedicationPanel({
  healthEventState,
  saved,
  onEvent,
  onClose,
  onSave,
}: {
  healthEventState: HealthEventState;
  saved: boolean;
  onEvent: (event: HealthEvent) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [showAddMedication, setShowAddMedication] = useState(false);
  const scheduleMedication = () => {
    onEvent(
      createMedicationScheduledEvent({
        medication: {
          dose: "5 mg",
          frequency: "Once daily",
          id: "amlodipine",
          name: "Amlodipine",
          reminderTime: "8:00 AM",
        },
      }),
    );
    onSave();
    setShowAddMedication(false);
  };

  return (
    <div className="card-soft border hairline overflow-hidden">
      <PanelHeader
        icon={Pill}
        title="Medications"
        subtitle="History, reminders, and prescribed meds."
        onClose={onClose}
        tone="bg-blush text-blush-foreground"
        action={
          <button
            onClick={() => setShowAddMedication((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Add medication"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />
      <div className="px-4 pb-4 space-y-4">
        {showAddMedication && (
          <div className="rounded-2xl bg-secondary p-3.5">
            <p className="text-[13px] font-semibold">Add prescribed medication</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Field label="Name" value="Amlodipine" />
              <Field label="Dosage" value="5 mg" />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <Field label="Frequency" value="Once daily" />
              <Field label="Reminder" value="8:00 AM" />
            </div>
            <button
              onClick={scheduleMedication}
              className="mt-3 w-full rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground"
            >
              Add medication
            </button>
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Due next
          </p>
          <div className="mt-2 space-y-2.5">
            {healthEventState.medications
              .filter((medication) => medication.id !== "lisinopril")
              .map((medication) => {
                const adherence = healthEventState.adherence[medication.id];
                const isTaken = adherence?.status === "taken";
                return (
                  <div
                    key={medication.id}
                    className="flex items-center gap-3 rounded-2xl bg-secondary px-3.5 py-3"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blush text-blush-foreground">
                      <Clock3 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium">
                        {medication.name} · {medication.dose}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {medication.reminderTime} · {medication.frequency}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onEvent(createMedicationTakenEvent({ medicationId: medication.id }));
                        onSave();
                      }}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                        isTaken ? "bg-sage text-sage-foreground" : "bg-card text-primary"
                      }`}
                    >
                      {isTaken ? "Taken" : "Mark taken"}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Medication history
          </p>
          <div className="mt-2 divide-y hairline overflow-hidden rounded-2xl bg-card">
            {healthEventState.events
              .filter(
                (event) =>
                  event.type === "MedicationTakenEvent" ||
                  event.type === "MedicationScheduledEvent" ||
                  event.type === "MedicationMissedEvent",
              )
              .slice(0, 4)
              .map((event) => (
                <div key={event.id} className="flex items-center gap-3 px-3.5 py-3">
                  <CheckCircle2 className="h-4 w-4 text-sage-foreground" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium">
                      {describeHealthEvent(event, healthEventState.medications)}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {event.createdAt} · {event.actorName}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <RecentHealthEvents
          events={healthEventState.events}
          medications={healthEventState.medications}
          title="Operational events"
        />

        {saved && (
          <div className="flex items-center gap-2 rounded-2xl bg-sage px-3.5 py-2.5 text-[13px] font-medium text-sage-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Medication updated
          </div>
        )}
      </div>
    </div>
  );
}

function VitalsPanel({
  healthEventState,
  saved,
  onEvent,
  onClose,
  onSave,
}: {
  healthEventState: HealthEventState;
  saved: boolean;
  onEvent: (event: HealthEvent) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [showAddReading, setShowAddReading] = useState(false);
  const addReading = () => {
    onEvent(
      createVitalsRecordedEvent({
        reading: createVitalsReading("Now", 124, 72, "148 lb", "Resting, after walk, device used"),
      }),
    );
    onSave();
    setShowAddReading(false);
  };
  const latestReading = healthEventState.vitalsReadings[healthEventState.vitalsReadings.length - 1];

  return (
    <div className="card-soft border hairline overflow-hidden">
      <PanelHeader
        icon={Activity}
        title="Vitals"
        subtitle="History, manual logs, and device sync setup."
        onClose={onClose}
        tone="bg-sage text-sage-foreground"
        action={
          <button
            onClick={() => setShowAddReading((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Add vitals reading"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />
      <div className="px-4 pb-4 space-y-4">
        <VitalsTrendChart readings={healthEventState.vitalsReadings} />

        {showAddReading && (
          <div className="rounded-2xl bg-secondary p-3.5">
            <p className="text-[13px] font-semibold">Add vitals reading</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Field label="Systolic" value="124" />
              <Field label="Diastolic" value="78" />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <Field label="Heart rate" value="72 bpm" />
              <Field label="Weight" value="148 lb" />
            </div>
            <label className="mt-2.5 block rounded-2xl bg-card px-3.5 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Context
              </span>
              <textarea
                className="mt-1 min-h-16 w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                placeholder="Resting, after walk, device used"
              />
            </label>
            <button
              onClick={addReading}
              className="mt-3 w-full rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground"
            >
              Add reading
            </button>
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent readings
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            <Vital
              label="Blood pressure"
              value={latestReading.bloodPressure}
              trend={latestReading.label}
              tone="sage"
            />
            <Vital
              label="Heart rate"
              value={String(latestReading.heartRate)}
              trend="Resting"
              tone="sky"
            />
            <Vital label="Weight" value={latestReading.weight} trend="Manual" tone="sand" />
          </div>
        </div>

        <RecentHealthEvents
          events={healthEventState.events.filter((event) => event.type === "VitalsRecordedEvent")}
          medications={healthEventState.medications}
          title="Vitals events"
        />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Device connections
          </p>
          <div className="mt-2 space-y-2.5">
            {HEALTH_DEVICE_INTEGRATIONS.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center gap-3 rounded-2xl bg-secondary px-3.5 py-3"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky text-sky-foreground">
                  {integration.id === "apple-health" ? (
                    <Smartphone className="h-4 w-4" />
                  ) : integration.id === "bluetooth-bp" ? (
                    <Bluetooth className="h-4 w-4" />
                  ) : (
                    <Watch className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{integration.name}</p>
                  <p className="text-[12px] text-muted-foreground">{integration.scope}</p>
                </div>
                <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Planned
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
            Device sync will require the mobile app and explicit permission before importing data.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-2xl bg-sage px-3.5 py-2.5 text-[13px] font-medium text-sage-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Vitals updated
          </div>
        )}
      </div>
    </div>
  );
}

function VitalsTrendChart({ readings }: { readings: VitalsReading[] }) {
  const points = readings.slice(-5);
  const systolicPath = points
    .map((point, index) => `${28 + index * 62},${166 - (point.systolic - 110) * 2.1}`)
    .join(" ");
  const heartPath = points
    .map((point, index) => `${28 + index * 62},${166 - (point.heartRate - 60) * 3}`)
    .join(" ");

  return (
    <div className="rounded-2xl bg-secondary p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">5-day trend</p>
          <p className="text-[12px] text-muted-foreground">Blood pressure and heart rate</p>
        </div>
        <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          Manual
        </span>
      </div>
      <svg
        viewBox="0 0 280 180"
        className="mt-3 h-40 w-full"
        role="img"
        aria-label="Vitals history chart"
      >
        {[42, 78, 114, 150].map((y) => (
          <line key={y} x1="24" x2="276" y1={y} y2={y} className="stroke-border" strokeWidth="1" />
        ))}
        <polyline
          points={systolicPath}
          fill="none"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={heartPath}
          fill="none"
          className="stroke-sage-foreground"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g key={point.label}>
            <circle
              cx={28 + index * 62}
              cy={166 - (point.systolic - 110) * 2.1}
              r="4"
              className="fill-primary"
            />
            <circle
              cx={28 + index * 62}
              cy={166 - (point.heartRate - 60) * 3}
              r="4"
              className="fill-sage-foreground"
            />
            <text
              x={28 + index * 62}
              y="176"
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Systolic
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sage-foreground" />
          Heart rate
        </span>
      </div>
    </div>
  );
}

function RecentHealthEvents({
  events,
  medications,
  title,
}: {
  events: HealthEvent[];
  medications: Medication[];
  title: string;
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 space-y-2">
        {events.slice(0, 3).map((event) => (
          <div key={event.id} className="rounded-2xl bg-secondary px-3.5 py-3">
            <p className="text-[13px] font-medium">{describeHealthEvent(event, medications)}</p>
            <p className="text-[12px] text-muted-foreground">
              {describeActor(event)} · {event.createdAt}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {event.type} · {event.operationalContext}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  tone,
  onClose,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone: string;
  onClose: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        <p className="text-[12px] text-muted-foreground">{subtitle}</p>
      </div>
      {action}
      <button
        onClick={onClose}
        aria-label="Close quick action"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block rounded-2xl bg-secondary px-3.5 py-3">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        className="mt-1 w-full bg-transparent text-[15px] font-medium outline-none"
        defaultValue={value}
      />
    </label>
  );
}

function Section({
  title,
  children,
  cta,
}: {
  title: string;
  children: React.ReactNode;
  cta?: React.ReactNode;
}) {
  return (
    <section className="px-6 mt-7">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {cta}
      </div>
      {children}
    </section>
  );
}

function Alert({
  tone,
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  tone: "warn" | "info";
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action: string;
}) {
  const toneCls = tone === "warn" ? "bg-sand text-sand-foreground" : "bg-sky text-sky-foreground";
  return (
    <div className="card-soft px-4 py-3.5 mb-2.5 flex items-center gap-3">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${toneCls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-[14px] font-medium">{title}</p>
        <p className="text-[12px] text-muted-foreground">{subtitle}</p>
      </div>
      <button className="text-[12px] font-medium text-primary px-3 py-1.5 rounded-full bg-secondary">
        {action}
      </button>
    </div>
  );
}

function Row({
  time,
  icon: Icon,
  iconBg,
  title,
  sub,
  done,
}: {
  time: string;
  icon: LucideIcon;
  iconBg: string;
  title: string;
  sub: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-[58px] text-[11px] font-semibold text-muted-foreground tracking-wide">
        {time}
      </div>
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p
          className={`text-[14px] font-medium ${done ? "line-through text-muted-foreground" : ""}`}
        >
          {title}
        </p>
        <p className="text-[12px] text-muted-foreground">{sub}</p>
      </div>
      {done && (
        <span className="text-[11px] font-medium text-sage-foreground bg-sage rounded-full px-2 py-0.5">
          Done
        </span>
      )}
    </div>
  );
}

function UpdateCard({
  who,
  role,
  time,
  body,
  chip,
}: {
  who: string;
  role: string;
  time: string;
  body: string;
  chip: { label: string; tone: "sky" | "sage" };
}) {
  const toneCls =
    chip.tone === "sky" ? "bg-sky text-sky-foreground" : "bg-sage text-sage-foreground";
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${toneCls}`}
        >
          {chip.label}
        </span>
        <span className="text-[12px] text-muted-foreground">
          {who} · {role} · {time}
        </span>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

function Vital({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: "sage" | "sky" | "sand";
}) {
  const toneCls =
    tone === "sage"
      ? "bg-sage text-sage-foreground"
      : tone === "sky"
        ? "bg-sky text-sky-foreground"
        : "bg-sand text-sand-foreground";
  return (
    <div className="card-soft p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-[20px] font-semibold tracking-tight">{value}</p>
      <span
        className={`mt-2 inline-block text-[10px] font-medium rounded-full px-2 py-0.5 ${toneCls}`}
      >
        {trend}
      </span>
    </div>
  );
}
