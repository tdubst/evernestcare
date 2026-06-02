import { createFileRoute } from "@tanstack/react-router";
import { useReducer, useState } from "react";
import {
  type LucideIcon,
  Pill,
  CalendarDays,
  AlertCircle,
  Activity,
  ScanLine,
  CheckCircle2,
  X,
  Plus,
  Clock3,
  Bluetooth,
  Watch,
  Smartphone,
  Share2,
  ClipboardCheck,
} from "lucide-react";

import { HEALTH_DEVICE_INTEGRATIONS } from "@/lib/integrations/health-devices";
import {
  createCareNoteAddedEvent,
  createInitialHealthEventState,
  createMedicationScheduledEvent,
  createMedicationTakenEvent,
  createVitalsReading,
  createVitalsRecordedEvent,
  describeActor,
  describeHealthEvent,
  healthEventReducer,
  type HealthEvent,
  type HealthEventState,
  type CareArtifact,
  type CareProfile,
  type CareCircle,
  type ContinuitySignal,
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
  projectContinuitySignals,
  projectOperationalTimeline,
} from "@/lib/health-events";

export const Route = createFileRoute("/_tabs/today")({
  head: () => ({ meta: [{ title: "Today — Evernest Care" }] }),
  component: Today,
});

type VitalsFocus = "bp" | "hr" | "weight";
type HomeWorkflow = "home" | "visit" | "med" | "vitals";

function Today() {
  const [activeWorkflow, setActiveWorkflow] = useState<HomeWorkflow>("home");
  const [savedPanel, setSavedPanel] = useState<"med" | "vitals" | null>(null);
  const [shareSummaryOpen, setShareSummaryOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [timeframe, setTimeframe] = useState<TimeframePreset>("7d");
  const [healthEventState, dispatchHealthEvent] = useReducer(
    healthEventReducer,
    undefined,
    createInitialHealthEventState,
  );
  const timelineQuery = { filter: timelineFilter, timeframe };
  const timeline = projectOperationalTimeline(healthEventState, timelineQuery);
  const continuitySignals = projectContinuitySignals(healthEventState, timelineQuery);
  const providerSummary = createProviderSummary(healthEventState, timelineQuery);
  const careProfile = createDefaultCareProfile();
  const providerSummaryExport = createProviderSummaryExport({
    artifacts: healthEventState.artifacts,
    careProfile,
    signals: continuitySignals,
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
  const openWorkflow = (panel: HomeWorkflow) => {
    setActiveWorkflow(panel);
    setSavedPanel(null);
  };

  const closeWorkflow = () => {
    setActiveWorkflow("home");
    setSavedPanel(null);
  };

  return (
    <div>
      {/* Header */}
      <header className="px-6 pt-14 pb-4">
        <p className="text-[13px] font-medium text-muted-foreground">Tuesday, May 26</p>
        <h1 className="mt-1 text-[30px] font-semibold tracking-tight">Home</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Good morning, Sarah. Here is what matters for Mom today.
        </p>
      </header>

      {/* Care recipient bar */}
      <div className="px-6">
        <div className="flex items-center gap-3 card-soft px-4 py-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blush text-blush-foreground text-[14px] font-semibold">
            MC
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">Margaret Chen</p>
            <p className="text-[12px] text-muted-foreground">82 · Older adult care · 4 on team</p>
          </div>
          <button className="text-[12px] font-medium text-primary">Switch</button>
        </div>
      </div>

      <Section title="Today at a glance">
        <div className="grid grid-cols-3 gap-2.5">
          <HomeStatusCard
            icon={Pill}
            label="Medications"
            value="2 due"
            detail="Next at 1:00 PM"
            tone="bg-blush text-blush-foreground"
          />
          <HomeStatusCard
            icon={CalendarDays}
            label="Appointment"
            value="11:30 AM"
            detail="David driving"
            tone="bg-sky text-sky-foreground"
          />
          <HomeStatusCard
            icon={Activity}
            label="Vitals"
            value="124/78"
            detail="Last checked Fri"
            tone="bg-sage text-sage-foreground"
          />
        </div>
      </Section>

      {/* Quick actions */}
      <div className="px-6 mt-5 grid grid-cols-3 gap-2.5">
        {[
          {
            i: Pill,
            l: "Medications",
            s: "2 due",
            v: "med",
            c: "bg-blush text-blush-foreground",
            onClick: () => openWorkflow("med"),
          },
          {
            i: Activity,
            l: "Vitals",
            s: "Last Fri",
            v: "vitals",
            c: "bg-sage text-sage-foreground",
            onClick: () => openWorkflow("vitals"),
          },
          {
            i: ClipboardCheck,
            l: "Visit Prep",
            s: "Ready",
            v: "visit",
            c: "bg-sky text-sky-foreground",
            onClick: () => openWorkflow("visit"),
          },
        ].map(({ i: Icon, l, s, v, c, onClick }) => (
          <button key={l} onClick={onClick} className="flex flex-col items-center gap-1.5">
            <span
              className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${c} shadow-soft ${
                activeWorkflow === v
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : ""
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-foreground">{l}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {s}
            </span>
          </button>
        ))}
      </div>

      {activeWorkflow === "med" && (
        <div className="px-6 mt-4">
          <LogMedicationPanel
            healthEventState={healthEventState}
            saved={savedPanel === "med"}
            onEvent={dispatchHealthEvent}
            onClose={closeWorkflow}
            onSave={() => setSavedPanel("med")}
          />
        </div>
      )}

      {activeWorkflow === "vitals" && (
        <div className="px-6 mt-4">
          <VitalsPanel
            healthEventState={healthEventState}
            saved={savedPanel === "vitals"}
            onEvent={dispatchHealthEvent}
            onClose={closeWorkflow}
            onSave={() => setSavedPanel("vitals")}
          />
        </div>
      )}

      {activeWorkflow === "visit" && (
        <>
          <Section title="Visit prep">
            <VisitPrepCard
              artifacts={healthEventState.artifacts}
              providerSummary={providerSummary}
              signals={continuitySignals}
              timeline={timeline}
            />
          </Section>
          <Section title="Visit summary">
            <ProviderSummaryCard
              careProfile={careProfile}
              exportSnapshot={providerSummaryExport}
              signals={continuitySignals}
              summary={providerSummary}
              timeframe={timeframe}
              onShare={() => setShareSummaryOpen(true)}
            />
          </Section>
        </>
      )}

      {activeWorkflow === "home" && (
        <>
          <Section title="Today’s priorities">
            <ContinuitySignalsCard signals={continuitySignals} timeframe={timeframe} />
          </Section>

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
            </div>
          </Section>

          <Section title="Recent changes">
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

          <Section title="Recent updates">
            <OperationalTimelineCard
              careCircle={careCircle}
              filter={timelineFilter}
              onAddNote={addCollaborativeNote}
              onFilterChange={setTimelineFilter}
              onTimeframeChange={setTimeframe}
              signals={continuitySignals}
              summary={providerSummary}
              timeframe={timeframe}
              timeline={timeline}
            />
          </Section>

          <Section
            title="Visit prep"
            cta={
              <button
                onClick={() => openWorkflow("visit")}
                className="text-[13px] font-medium text-primary"
              >
                Prepare
              </button>
            }
          >
            <VisitPrepCard
              artifacts={healthEventState.artifacts}
              providerSummary={providerSummary}
              signals={continuitySignals}
              timeline={timeline}
            />
          </Section>
        </>
      )}
      {shareSummaryOpen && (
        <PrivacyConfirmationSheet
          title="Share provider summary"
          description="This visit-ready snapshot includes medications, recent vitals, care notes, and linked files."
          audience="Included in visit summary"
          expires="Access ends after visit"
          primaryAction="Prepare share"
          onClose={() => setShareSummaryOpen(false)}
        />
      )}
    </div>
  );
}

function VisitPrepCard({
  artifacts,
  providerSummary,
  signals,
  timeline,
}: {
  artifacts: CareArtifact[];
  providerSummary: ProviderSummary;
  signals: ContinuitySignal[];
  timeline: TimelineItem[];
}) {
  const recentMedicationChange = timeline.find((item) => item.family === "medications");
  const recentNote = timeline.find((item) => item.family === "notes");
  const recentArtifact = artifacts.find((artifact) => artifact.summaryVisible);

  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Appointment handoff</p>
          <p className="text-[12px] text-muted-foreground">
            A concise view for the next appointment.
          </p>
        </div>
        <span className="rounded-full bg-sky px-2.5 py-1 text-[11px] font-medium text-sky-foreground">
          Ready
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <VisitPrepItem
          label="Review first"
          value={signals[0]?.title ?? "Nothing urgent"}
          detail={signals[0]?.detail ?? "No care gaps surfaced for this view."}
        />
        <VisitPrepItem
          label="Recent change"
          value={recentMedicationChange?.description ?? "No medication change"}
          detail={
            recentMedicationChange ? describeActor(recentMedicationChange.event) : "Nothing new"
          }
        />
        <VisitPrepItem
          label="Care note"
          value={recentNote?.description ?? "No new care note"}
          detail={recentNote ? describeActor(recentNote.event) : "No recent note in this window"}
        />
        <VisitPrepItem
          label="Attached"
          value={recentArtifact?.title ?? "No summary file"}
          detail={recentArtifact?.previewLabel ?? "Vault files can be attached when needed"}
        />
      </div>

      <div className="mt-3 rounded-2xl bg-secondary px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Provider snapshot
        </p>
        <p className="mt-1 text-[13px] leading-relaxed">
          {providerSummary.eventCount} updates · {providerSummary.continuitySignalCount} things to
          review · {providerSummary.artifactEventCount} file
          {providerSummary.artifactEventCount === 1 ? "" : "s"}. For coordination only.
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <PrivacyPill label="Included in visit summary" />
        <PrivacyPill label="Access ends after visit" />
        <PrivacyPill label="For coordination only" />
      </div>
    </div>
  );
}

function HomeStatusCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="card-soft p-3.5">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[17px] font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{detail}</p>
    </div>
  );
}

function VisitPrepItem({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-medium leading-snug">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function OperationalTimelineCard({
  careCircle,
  filter,
  onAddNote,
  onFilterChange,
  onTimeframeChange,
  signals,
  summary,
  timeframe,
  timeline,
}: {
  careCircle: CareCircle;
  filter: TimelineFilter;
  onAddNote: () => void;
  onFilterChange: (filter: TimelineFilter) => void;
  onTimeframeChange: (timeframe: TimeframePreset) => void;
  signals: ContinuitySignal[];
  summary: ProviderSummary;
  timeframe: TimeframePreset;
  timeline: TimelineItem[];
}) {
  const signalsByEventId = new Map(
    signals
      .filter((signal) => signal.sourceEventId)
      .map((signal) => [signal.sourceEventId, signal.title]),
  );

  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Family activity</p>
          <p className="text-[12px] text-muted-foreground">
            {summary.eventCount} update{summary.eventCount === 1 ? "" : "s"} in{" "}
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
              <p className="mt-1 text-[11px] text-muted-foreground">Shared care update</p>
              {signalsByEventId.has(item.event.id) && (
                <p className="mt-1 inline-flex rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-primary">
                  {signalsByEventId.get(item.event.id)}
                </p>
              )}
            </div>
          </div>
        ))}
        {timeline.length === 0 && (
          <div className="rounded-2xl bg-secondary px-3.5 py-3 text-[13px] text-muted-foreground">
            No recent updates match this view.
          </div>
        )}
      </div>
    </div>
  );
}

function ContinuitySignalsCard({
  signals,
  timeframe,
}: {
  signals: ContinuitySignal[];
  timeframe: TimeframePreset;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Things to review</p>
          <p className="text-[12px] text-muted-foreground">
            Based on recent updates from {formatTimeframeLabel({ filter: "all", timeframe })}.
          </p>
        </div>
        <span className="rounded-full bg-sage px-2.5 py-1 text-[11px] font-medium text-sage-foreground">
          Up to date
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {signals.slice(0, 4).map((signal) => (
          <div key={signal.id} className="flex gap-3 rounded-2xl bg-secondary px-3.5 py-3">
            <span
              className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full ${getSignalToneClass(signal.tone)}`}
            >
              {signal.tone === "follow-up" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{signal.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {signal.detail}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatSignalKind(signal.kind)} · {signal.timeframeLabel}
              </p>
            </div>
          </div>
        ))}
        {signals.length === 0 && (
          <div className="rounded-2xl bg-secondary px-3.5 py-3 text-[13px] text-muted-foreground">
            Nothing needs review in this view.
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        These are care coordination reminders only. Evernest Care does not diagnose, predict, or
        recommend care.
      </p>
    </div>
  );
}

function formatSignalKind(kind: ContinuitySignal["kind"]) {
  switch (kind) {
    case "medication-gap":
      return "Medication";
    case "vitals-gap":
      return "Vitals";
    case "care-observation":
      return "Care note";
    case "artifact-follow-up":
      return "Files";
    case "circle-participation":
      return "Care team";
  }
}

function ProviderSummaryCard({
  careProfile,
  exportSnapshot,
  signals,
  summary,
  timeframe,
  onShare,
}: {
  careProfile: CareProfile;
  exportSnapshot: ReturnType<typeof createProviderSummaryExport>;
  signals: ContinuitySignal[];
  summary: ProviderSummary;
  timeframe: TimeframePreset;
  onShare: () => void;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Visit-ready summary</p>
          <p className="text-[12px] text-muted-foreground">
            {formatTimeframeLabel({ filter: "all", timeframe })}
          </p>
        </div>
        <span className="rounded-full bg-sky px-2.5 py-1 text-[11px] font-medium text-sky-foreground">
          For visit
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

      <div className="mt-3 rounded-2xl bg-secondary px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Things to mention
        </p>
        <p className="mt-1 text-[13px] leading-relaxed">
          {signals.length > 0
            ? signals
                .slice(0, 2)
                .map((signal) => signal.title)
                .join(" · ")
            : "Nothing needs review."}
        </p>
      </div>

      <button
        onClick={onShare}
        className="mt-3 w-full rounded-2xl bg-secondary p-3.5 text-left active:scale-[0.99] transition"
      >
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[13px] font-semibold">{exportSnapshot.title}</p>
            <p className="text-[11px] text-muted-foreground">
              Built from recent care updates for coordination.
            </p>
          </div>
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
        <div className="mt-3 flex flex-wrap gap-2">
          <PrivacyPill label="Included in visit summary" />
          <PrivacyPill label="Access ends after visit" />
        </div>
      </button>
    </div>
  );
}

function getSignalToneClass(tone: ContinuitySignal["tone"]) {
  if (tone === "follow-up") return "bg-sand text-sand-foreground";
  if (tone === "watch") return "bg-sky text-sky-foreground";
  return "bg-sage text-sage-foreground";
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

function PrivacyPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function PrivacyConfirmationSheet({
  title,
  description,
  audience,
  expires,
  primaryAction,
  onClose,
}: {
  title: string;
  description: string;
  audience: string;
  expires: string;
  primaryAction: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30">
      <div className="w-full max-w-[440px] rounded-t-3xl bg-card p-5 pb-8 shadow-card">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Before sharing
        </p>
        <h3 className="mt-1 text-[22px] font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-4 space-y-2">
          <PrivacyRow label="Audience" value={audience} />
          <PrivacyRow label="Access" value={expires} />
          <PrivacyRow label="Use" value="For coordination only" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            onClick={onClose}
            className="rounded-full bg-secondary py-3 text-[14px] font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground"
          >
            {primaryAction}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivacyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-3.5 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-right text-[13px] font-medium">{value}</span>
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
          title="Activity history"
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
  const [selectedVital, setSelectedVital] = useState<VitalsFocus>("bp");
  const selectedVitalLabel =
    selectedVital === "bp" ? "blood pressure" : selectedVital === "hr" ? "heart rate" : "weight";
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
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Select a vital
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            <VitalSelector
              active={selectedVital === "bp"}
              label="Blood pressure"
              onClick={() => setSelectedVital("bp")}
              value={latestReading.bloodPressure}
              trend={latestReading.label}
              tone="sage"
            />
            <VitalSelector
              active={selectedVital === "hr"}
              label="Heart rate"
              onClick={() => setSelectedVital("hr")}
              value={String(latestReading.heartRate)}
              trend="Resting"
              tone="sky"
            />
            <VitalSelector
              active={selectedVital === "weight"}
              label="Weight"
              onClick={() => setSelectedVital("weight")}
              value={latestReading.weight}
              trend="Manual"
              tone="sand"
            />
          </div>
        </div>

        <VitalsTrendCharts
          readings={healthEventState.vitalsReadings}
          selectedVital={selectedVital}
        />

        {showAddReading && (
          <div className="rounded-2xl bg-secondary p-3.5">
            <p className="text-[13px] font-semibold">Add {selectedVitalLabel} reading</p>
            {selectedVital === "bp" && (
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Field label="Systolic" value="124" />
                <Field label="Diastolic" value="78" />
              </div>
            )}
            {selectedVital === "hr" && (
              <div className="mt-3">
                <Field label="Heart rate" value="72 bpm" />
              </div>
            )}
            {selectedVital === "weight" && (
              <div className="mt-3">
                <Field label="Weight" value="148 lb" />
              </div>
            )}
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
            Sensitive care details should stay out of notifications and device logs.
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

function VitalsTrendCharts({
  readings,
  selectedVital,
}: {
  readings: VitalsReading[];
  selectedVital: VitalsFocus;
}) {
  const points = readings.slice(-5);
  const bloodPressureSeries = [
    {
      label: "Systolic",
      values: points.map((point) => point.systolic),
      className: "stroke-primary",
      dotClassName: "fill-primary",
      legendClassName: "bg-primary",
    },
    {
      label: "Diastolic",
      values: points.map((point) => Number(point.bloodPressure.split("/")[1] ?? 78)),
      className: "stroke-sage-foreground",
      dotClassName: "fill-sage-foreground",
      legendClassName: "bg-sage-foreground",
    },
  ];
  const heartRateSeries = [
    {
      label: "Heart rate",
      values: points.map((point) => point.heartRate),
      className: "stroke-sage-foreground",
      dotClassName: "fill-sage-foreground",
      legendClassName: "bg-sage-foreground",
    },
  ];
  const weightSeries = [
    {
      label: "Weight",
      values: points.map((point) => Number.parseFloat(point.weight)),
      className: "stroke-primary",
      dotClassName: "fill-primary",
      legendClassName: "bg-primary",
    },
  ];

  if (selectedVital === "bp") {
    return (
      <OperationalTrendChart
        title="Blood pressure"
        subtitle="Systolic and diastolic trend"
        ariaLabel="Blood pressure trend chart"
        labels={points.map((point) => point.label)}
        series={bloodPressureSeries}
        min={60}
        max={145}
        unit="mmHg"
      />
    );
  }

  if (selectedVital === "hr") {
    return (
      <OperationalTrendChart
        title="Heart rate"
        subtitle="Resting trend visibility"
        ariaLabel="Heart rate trend chart"
        labels={points.map((point) => point.label)}
        series={heartRateSeries}
        min={55}
        max={85}
        unit="bpm"
      />
    );
  }

  return (
    <OperationalTrendChart
      title="Weight"
      subtitle="Longitudinal continuity"
      ariaLabel="Weight trend chart"
      labels={points.map((point) => point.label)}
      series={weightSeries}
      min={145}
      max={152}
      unit="lb"
    />
  );
}

function OperationalTrendChart({
  ariaLabel,
  labels,
  max,
  min,
  series,
  subtitle,
  title,
  unit,
}: {
  ariaLabel: string;
  labels: string[];
  max: number;
  min: number;
  series: {
    className: string;
    dotClassName: string;
    label: string;
    legendClassName: string;
    values: number[];
  }[];
  subtitle: string;
  title: string;
  unit: string;
}) {
  const chartWidth = 280;
  const chartHeight = 126;
  const horizontalStep = labels.length > 1 ? 224 / (labels.length - 1) : 0;
  const yFor = (value: number) => {
    const normalized = (value - min) / (max - min);
    return chartHeight - 18 - Math.max(0, Math.min(1, normalized)) * 88;
  };

  return (
    <div className="rounded-2xl bg-secondary p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
        <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="mt-3 h-32 w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {[28, 62, 96].map((y) => (
          <line key={y} x1="24" x2="272" y1={y} y2={y} className="stroke-border" strokeWidth="1" />
        ))}
        {series.map((item) => {
          const points = item.values
            .map((value, index) => `${28 + index * horizontalStep},${yFor(value)}`)
            .join(" ");
          return (
            <g key={item.label}>
              <polyline
                points={points}
                fill="none"
                className={item.className}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {item.values.map((value, index) => (
                <circle
                  key={`${item.label}-${labels[index]}`}
                  cx={28 + index * horizontalStep}
                  cy={yFor(value)}
                  r="3.5"
                  className={item.dotClassName}
                />
              ))}
            </g>
          );
        })}
        {labels.map((label, index) => (
          <text
            key={label}
            x={28 + index * horizontalStep}
            y="118"
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {label}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {series.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${item.legendClassName}`} />
            {item.label}
          </span>
        ))}
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
            <p className="mt-1 text-[11px] text-muted-foreground">Shared care update</p>
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

function VitalSelector({
  active,
  label,
  onClick,
  value,
  trend,
  tone,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
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
    <button
      onClick={onClick}
      className={`card-soft p-3.5 text-left transition ${
        active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
      aria-pressed={active}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-[20px] font-semibold tracking-tight">{value}</p>
      <span
        className={`mt-2 inline-block text-[10px] font-medium rounded-full px-2 py-0.5 ${toneCls}`}
      >
        {trend}
      </span>
    </button>
  );
}
