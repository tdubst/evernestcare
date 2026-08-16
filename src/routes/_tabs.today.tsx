import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useReducer, useState } from "react";
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
  Watch,
  Smartphone,
  ClipboardCheck,
} from "lucide-react";

import { HEALTH_DEVICE_INTEGRATIONS } from "@/lib/integrations/health-devices";
import { useAuth } from "@/lib/auth/auth-context";
import { releaseScope } from "@/lib/release";
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
  mergeHealthEventsIntoState,
  type HealthEvent,
  type HealthEventState,
  type CareNoteAddedEvent,
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
  formatTimeframeLabel,
  projectContinuitySignals,
  projectOperationalTimeline,
} from "@/lib/health-events";
import { type PermissionRuntimeStatus, usePermissions } from "@/lib/permissions/permission-context";
import {
  isPersistableMedicationVitalsEvent,
  persistHealthEvent,
  readRecentPersistedHealthEvents,
  readPersistedHealthEvent,
} from "@/lib/persistence/care-events-repository";

export const Route = createFileRoute("/_tabs/today")({
  head: () => ({ meta: [{ title: "Today — Evernest Care" }] }),
  component: Today,
});

type VitalsFocus = "bp" | "hr" | "weight";
type HomeWorkflow = "home" | "visit" | "med" | "vitals";
type PersistenceProofState =
  | { status: "idle" }
  | { detail: string; status: "saving" }
  | { detail: string; status: "saved" }
  | { detail: string; status: "read-back" }
  | { detail: string; status: "unavailable" };
type PersistedHydrationState =
  | { eventCount: number; status: "idle" }
  | { eventCount: number; status: "loading" }
  | { eventCount: number; status: "ready" }
  | { eventCount: number; status: "unavailable" };
type CareNoteType = CareNoteAddedEvent["payload"]["noteType"];
type CareNoteSaveState =
  | { status: "idle" }
  | { status: "draft" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "read-back" }
  | { status: "restored" }
  | { status: "unavailable" }
  | { status: "denied" };
type TodayHealthEventAction =
  | HealthEvent
  | { events: HealthEvent[]; type: "hydrate-persisted-events" };

const CARE_NOTE_MAX_LENGTH = 2000;
const CARE_NOTE_TYPE_OPTIONS = [
  { label: "Caregiver context", value: "caregiver-context" },
  { label: "Operational concern", value: "operational-concern" },
  { label: "Symptom observation", value: "symptom-observation" },
  { label: "Recovery observation", value: "recovery-observation" },
] satisfies { label: string; value: CareNoteType }[];

function todayHealthEventReducer(
  state: HealthEventState,
  action: TodayHealthEventAction,
): HealthEventState {
  if (action.type === "hydrate-persisted-events") {
    return mergeHealthEventsIntoState(state, action.events);
  }

  return healthEventReducer(state, action);
}

function filterCareNotesFromHealthEventState(state: HealthEventState): HealthEventState {
  return {
    ...state,
    events: state.events.filter((event) => event.type !== "CareNoteAddedEvent"),
  };
}

function Today() {
  const [activeWorkflow, setActiveWorkflow] = useState<HomeWorkflow>("home");
  const [savedPanel, setSavedPanel] = useState<"med" | "vitals" | null>(null);
  const [persistenceProof, setPersistenceProof] = useState<PersistenceProofState>({
    status: "idle",
  });
  const [persistedHydration, setPersistedHydration] = useState<PersistedHydrationState>({
    eventCount: 0,
    status: "idle",
  });
  const [careNoteDraft, setCareNoteDraft] = useState("");
  const [careNoteError, setCareNoteError] = useState<string | null>(null);
  const [careNoteSaveState, setCareNoteSaveState] = useState<CareNoteSaveState>({
    status: "idle",
  });
  const [careNoteType, setCareNoteType] = useState<CareNoteType>("caregiver-context");
  const [careNoteComposerOpen, setCareNoteComposerOpen] = useState(false);
  const [homeNotice, setHomeNotice] = useState<{
    title: string;
    description: string;
    action: string;
  } | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [timeframe, setTimeframe] = useState<TimeframePreset>("7d");
  const [healthEventState, dispatchHealthEvent] = useReducer(
    todayHealthEventReducer,
    undefined,
    createInitialHealthEventState,
  );
  const { client } = useAuth();
  const permissions = usePermissions();
  const canUsePrototypeCareNotes =
    permissions.status === "unconfigured" || permissions.isBetaPreviewWorkspace;
  const canRenderCareNotes =
    permissions.status === "ready" ? permissions.careNoteAccess.canView : canUsePrototypeCareNotes;
  const visibleHealthEventState = canRenderCareNotes
    ? healthEventState
    : filterCareNotesFromHealthEventState(healthEventState);

  useEffect(() => {
    const boundary =
      permissions.activeCareTeamId && permissions.activeCareRecipientId && permissions.appUserId
        ? {
            actorUserId: permissions.appUserId,
            careRecipientId: permissions.activeCareRecipientId,
            careTeamId: permissions.activeCareTeamId,
          }
        : null;

    if (permissions.status !== "ready" || !boundary || !client) {
      setPersistedHydration({ eventCount: 0, status: "idle" });
      return;
    }

    let active = true;
    setPersistedHydration((current) => ({
      eventCount: current.eventCount,
      status: "loading",
    }));

    void readRecentPersistedHealthEvents({
      boundary,
      client,
      includeCareNotes: permissions.careNoteAccess.canView,
    })
      .then((result) => {
        if (!active) return;

        if (result.status !== "read") {
          setPersistedHydration({ eventCount: 0, status: "unavailable" });
          return;
        }

        dispatchHealthEvent({
          events: result.events,
          type: "hydrate-persisted-events",
        });
        if (result.events.some((event) => event.type === "CareNoteAddedEvent")) {
          setCareNoteSaveState({ status: "restored" });
        }
        setPersistedHydration({
          eventCount: result.events.length,
          status: "ready",
        });
      })
      .catch(() => {
        if (!active) return;
        setPersistedHydration({ eventCount: 0, status: "unavailable" });
      });

    return () => {
      active = false;
    };
  }, [
    client,
    permissions.activeCareRecipientId,
    permissions.activeCareTeamId,
    permissions.appUserId,
    permissions.careNoteAccess.canView,
    permissions.permissionVersion,
    permissions.status,
  ]);

  useEffect(() => {
    if (!canRenderCareNotes && careNoteSaveState.status === "restored") {
      setCareNoteSaveState({ status: "idle" });
    }
  }, [canRenderCareNotes, careNoteSaveState.status]);

  const recordHealthEvent = useCallback(
    (event: HealthEvent) => {
      dispatchHealthEvent(event);

      if (!isPersistableMedicationVitalsEvent(event)) {
        return;
      }

      const boundary =
        permissions.activeCareTeamId && permissions.activeCareRecipientId && permissions.appUserId
          ? {
              actorUserId: permissions.appUserId,
              careRecipientId: permissions.activeCareRecipientId,
              careTeamId: permissions.activeCareTeamId,
            }
          : null;

      setPersistenceProof({
        detail: "Checking the care workspace before saving.",
        status: "saving",
      });

      if (permissions.isBetaPreviewWorkspace) {
        setPersistenceProof({
          detail: "Saved to this beta workspace preview.",
          status: "read-back",
        });
        return;
      }

      void persistHealthEvent({ boundary, client, event })
        .then(async (result) => {
          if (result.status === "skipped") {
            setPersistenceProof({
              detail: "Local beta preview remains available on this device.",
              status: "unavailable",
            });
            return;
          }

          if (result.status === "error") {
            setPersistenceProof({
              detail: "The local update was kept, but persistence was unavailable.",
              status: "unavailable",
            });
            return;
          }

          setPersistenceProof({
            detail: "Saved without showing care details.",
            status: "saved",
          });

          const readBack = await readPersistedHealthEvent({
            boundary,
            client,
            clientEventId: event.id,
          });

          if (readBack.status === "read") {
            setPersistenceProof({
              detail: "Saved to this workspace.",
              status: "read-back",
            });
            return;
          }

          setPersistenceProof({
            detail: "Save status is not available yet.",
            status: "saved",
          });
        })
        .catch(() => {
          setPersistenceProof({
            detail: "The local update was kept, but persistence was unavailable.",
            status: "unavailable",
          });
        });
    },
    [
      client,
      permissions.activeCareRecipientId,
      permissions.activeCareTeamId,
      permissions.appUserId,
      permissions.isBetaPreviewWorkspace,
    ],
  );
  const timelineQuery = { filter: timelineFilter, timeframe };
  const timeline = projectOperationalTimeline(visibleHealthEventState, timelineQuery);
  const recentMedicationOrVitalsUpdate = timeline.find(
    (item) => item.family === "medications" || item.family === "vitals",
  );
  const showCareTimelineConfidence = Boolean(
    recentMedicationOrVitalsUpdate &&
    (persistenceProof.status === "read-back" || persistedHydration.eventCount > 0),
  );
  const continuitySignals = projectContinuitySignals(visibleHealthEventState, timelineQuery);
  const providerSummary = createProviderSummary(visibleHealthEventState, timelineQuery);
  const persistenceProofDisplay = getPersistenceProofDisplay(permissions.status, persistenceProof);
  const workspaceAccessDisplay = getWorkspaceAccessDisplay(permissions);
  const careProfile = createDefaultCareProfile();
  const careCircle = healthEventState.careCircle;
  const careNoteStatusDisplay = getCareNoteStatusDisplay(careNoteSaveState);
  const handleCareNoteDraftChange = (value: string) => {
    setCareNoteDraft(value);
    setCareNoteError(null);
    setCareNoteSaveState({ status: "draft" });
  };
  const openCareNoteComposer = () => {
    setCareNoteComposerOpen(true);
    setCareNoteError(null);
    setCareNoteSaveState({ status: "draft" });
  };
  const closeCareNoteComposer = () => {
    setCareNoteComposerOpen(false);
    setCareNoteError(null);
    setCareNoteSaveState(careNoteDraft.trim() ? { status: "draft" } : { status: "idle" });
  };
  const addCareNote = () => {
    const trimmedNote = careNoteDraft.trim();

    if (!trimmedNote) {
      setCareNoteError("Add a note before saving.");
      setCareNoteSaveState({ status: "draft" });
      return;
    }

    if (trimmedNote.length > CARE_NOTE_MAX_LENGTH) {
      setCareNoteError("Keep notes under 2,000 characters.");
      setCareNoteSaveState({ status: "draft" });
      return;
    }

    if (!CARE_NOTE_TYPE_OPTIONS.some((option) => option.value === careNoteType)) {
      setCareNoteError("Choose an accepted note type.");
      setCareNoteSaveState({ status: "draft" });
      return;
    }

    const boundary =
      permissions.activeCareTeamId && permissions.activeCareRecipientId && permissions.appUserId
        ? {
            actorUserId: permissions.appUserId,
            careRecipientId: permissions.activeCareRecipientId,
            careTeamId: permissions.activeCareTeamId,
          }
        : null;
    const event = createCareNoteAddedEvent({
      actor: careCircle.actors[1],
      note: trimmedNote,
      noteType: careNoteType,
    });

    if (permissions.status === "unconfigured" || permissions.isBetaPreviewWorkspace) {
      dispatchHealthEvent(event);
      setCareNoteDraft("");
      setCareNoteComposerOpen(false);
      setCareNoteSaveState({
        status: permissions.isBetaPreviewWorkspace ? "read-back" : "unavailable",
      });
      return;
    }

    if (permissions.status !== "ready" || !boundary || !client) {
      setCareNoteSaveState({ status: "denied" });
      return;
    }

    if (!permissions.careNoteAccess.canAppend || !permissions.careNoteAccess.canView) {
      setCareNoteSaveState({ status: "denied" });
      return;
    }

    setCareNoteError(null);
    setCareNoteSaveState({ status: "saving" });

    void persistHealthEvent({ boundary, client, event })
      .then(async (result) => {
        if (result.status !== "persisted") {
          setCareNoteSaveState(
            result.status === "skipped" ? { status: "unavailable" } : { status: "denied" },
          );
          return;
        }

        setCareNoteSaveState({ status: "saved" });

        const readBack = await readPersistedHealthEvent({
          boundary,
          client,
          clientEventId: event.id,
        });

        if (readBack.status !== "read") {
          setCareNoteSaveState({ status: "denied" });
          return;
        }

        dispatchHealthEvent(event);
        setCareNoteDraft("");
        setCareNoteComposerOpen(false);
        setCareNoteSaveState({ status: "read-back" });
      })
      .catch(() => {
        setCareNoteSaveState({ status: "denied" });
      });
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
          Here is the beta care workspace status for today.
        </p>
      </header>

      {/* Care recipient bar */}
      <div className="px-6">
        <div className="flex items-center gap-3 card-soft px-4 py-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blush text-blush-foreground text-[14px] font-semibold">
            EC
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">Evelyn's care workspace</p>
            <p className="text-[12px] text-muted-foreground">Family care demo · 3 on team</p>
          </div>
          <button
            onClick={() =>
              setHomeNotice({
                action: "Got it",
                description:
                  "Multiple care profiles are supported in the app structure. Switching profiles is planned for closed beta once persistence is connected.",
                title: "Profile switching",
              })
            }
            className="text-[12px] font-medium text-primary"
          >
            Switch
          </button>
        </div>
      </div>

      <div className="px-6 mt-3">
        <WorkspaceAccessCard state={workspaceAccessDisplay} />
      </div>

      <div className="px-6 mt-3">
        <PersistenceProofCard state={persistenceProofDisplay} />
      </div>
      {showCareTimelineConfidence && recentMedicationOrVitalsUpdate && (
        <div className="px-6 mt-3">
          <CareTimelineConfidenceCard />
        </div>
      )}

      <Section title="Today at a glance">
        <div className="grid grid-cols-3 gap-2.5">
          <HomeStatusCard
            icon={Pill}
            label="Care status"
            value="Preview"
            detail="Details hidden in beta"
            tone="bg-blush text-blush-foreground"
          />
          <HomeStatusCard
            icon={CalendarDays}
            label="Care prep"
            value="Ready"
            detail="Care team assigned"
            tone="bg-sky text-sky-foreground"
          />
          <HomeStatusCard
            icon={Activity}
            label="Check-in"
            value="Preview"
            detail="Details hidden in beta"
            tone="bg-sage text-sage-foreground"
          />
        </div>
      </Section>

      {/* Quick actions */}
      <div className="px-6 mt-5 grid grid-cols-3 gap-2.5">
        {[
          {
            i: Pill,
            l: "Care status",
            s: "Preview",
            v: "med",
            c: "bg-blush text-blush-foreground",
            onClick: () => openWorkflow("med"),
          },
          {
            i: Activity,
            l: "Check-in",
            s: "Preview",
            v: "vitals",
            c: "bg-sage text-sage-foreground",
            onClick: () => openWorkflow("vitals"),
          },
          {
            i: ClipboardCheck,
            l: "Care prep",
            s: "Preview",
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
            healthEventState={visibleHealthEventState}
            saved={savedPanel === "med"}
            onEvent={recordHealthEvent}
            onClose={closeWorkflow}
            onSave={() => setSavedPanel("med")}
          />
        </div>
      )}

      {activeWorkflow === "vitals" && (
        <div className="px-6 mt-4">
          <VitalsPanel
            healthEventState={visibleHealthEventState}
            saved={savedPanel === "vitals"}
            onEvent={recordHealthEvent}
            onClose={closeWorkflow}
            onSave={() => setSavedPanel("vitals")}
          />
        </div>
      )}

      {activeWorkflow === "visit" && (
        <>
          <Section title="Visit prep">
            <VisitPrepCard
              artifacts={visibleHealthEventState.artifacts}
              careTimelineConfidence={showCareTimelineConfidence}
              providerSummary={providerSummary}
              signals={continuitySignals}
              timeline={timeline}
            />
          </Section>
          <Section title="Care prep overview">
            <ProviderSummaryCard
              careProfile={careProfile}
              signals={continuitySignals}
              summary={providerSummary}
              timeframe={timeframe}
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
              title="Care status preview"
              subtitle="Yesterday evening · details hidden"
              action="View preview"
              onAction={() => openWorkflow("med")}
            />
            <Alert
              tone="info"
              icon={ScanLine}
              title="Care prep available"
              subtitle="Internal overview is ready inside the workspace"
              action="Open preview"
              onAction={() => openWorkflow("visit")}
            />
          </Section>

          <Section title="Today's schedule">
            <div className="card-soft divide-y hairline overflow-hidden">
              <Row
                time="Logged"
                icon={Pill}
                iconBg="bg-blush text-blush-foreground"
                title="Care status"
                sub="Updated in preview"
                done
              />
              <Row
                time="Ready"
                icon={CalendarDays}
                iconBg="bg-sky text-sky-foreground"
                title="Care prep"
                sub="Care team member assigned"
              />
              <Row
                time="Review"
                icon={Pill}
                iconBg="bg-blush text-blush-foreground"
                title="Care status"
                sub="Details hidden for beta preview"
              />
            </div>
          </Section>

          <Section title="Recent changes">
            <div className="space-y-3">
              <UpdateCard
                who="Care team"
                role="Workspace update"
                time="2h ago"
                body="Maya prepared today's family check-in and linked the latest Vault placeholder."
                chip={{ label: "Care update", tone: "sky" }}
              />
              <UpdateCard
                who="Jordan"
                role="Care Circle"
                time="Yesterday"
                body="Added an evening handoff note for the next family review."
                chip={{ label: "Family", tone: "sage" }}
              />
            </div>
          </Section>

          <Section title="Recent updates">
            <OperationalTimelineCard
              careCircle={careCircle}
              careNoteComposerOpen={careNoteComposerOpen}
              careNoteDraft={careNoteDraft}
              careNoteError={careNoteError}
              careNoteStatus={careNoteStatusDisplay}
              careNoteType={careNoteType}
              filter={timelineFilter}
              onAddNote={addCareNote}
              onCareNoteDraftChange={handleCareNoteDraftChange}
              onCareNoteTypeChange={(value) => {
                setCareNoteType(value);
                setCareNoteError(null);
                setCareNoteSaveState({ status: "draft" });
              }}
              onCloseCareNoteComposer={closeCareNoteComposer}
              onFilterChange={setTimelineFilter}
              onOpenCareNoteComposer={openCareNoteComposer}
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
                Open
              </button>
            }
          >
            <VisitPrepCard
              artifacts={visibleHealthEventState.artifacts}
              careTimelineConfidence={showCareTimelineConfidence}
              providerSummary={providerSummary}
              signals={continuitySignals}
              timeline={timeline}
            />
          </Section>
        </>
      )}
      {homeNotice && (
        <PrivacyConfirmationSheet
          title={homeNotice.title}
          description={homeNotice.description}
          audience="Family visible"
          expires="Available during beta testing"
          primaryAction={homeNotice.action}
          onClose={() => setHomeNotice(null)}
        />
      )}
    </div>
  );
}

function VisitPrepCard({
  artifacts,
  careTimelineConfidence,
  providerSummary,
  signals,
  timeline,
}: {
  artifacts: CareArtifact[];
  careTimelineConfidence: boolean;
  providerSummary: ProviderSummary;
  signals: ContinuitySignal[];
  timeline: TimelineItem[];
}) {
  const recentCareUpdate = timeline.find(
    (item) => item.family === "medications" || item.family === "vitals",
  );
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
          label="Recent care update"
          value={recentCareUpdate?.description ?? "No status update"}
          detail={recentCareUpdate ? describeActor(recentCareUpdate.event) : "Nothing new"}
        />
        <VisitPrepItem
          label="Care notes"
          value="Not included"
          detail="Saved notes stay in Recent Updates for this beta"
        />
        <VisitPrepItem
          label="Attached"
          value={recentArtifact ? "Vault placeholder" : "No Vault placeholder"}
          detail={
            recentArtifact
              ? "Content hidden for beta preview"
              : "Vault placeholders can be linked when available"
          }
        />
      </div>

      <div className="mt-3 rounded-2xl bg-secondary px-3.5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Visit prep snapshot
        </p>
        <p className="mt-1 text-[13px] leading-relaxed">
          {providerSummary.eventCount} updates · {providerSummary.continuitySignalCount} things to
          review · {providerSummary.artifactEventCount} Vault placeholder
          {providerSummary.artifactEventCount === 1 ? "" : "s"}. For coordination only.
        </p>
      </div>
      {careTimelineConfidence && (
        <div className="mt-3 flex gap-2 rounded-2xl bg-sage px-3.5 py-3 text-sage-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold">Available in care prep</p>
            <p className="mt-0.5 text-[12px] leading-relaxed">
              Internal prep is available for the next appointment. For coordination only.
            </p>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <PrivacyPill label="Internal preview only" />
        <PrivacyPill label="No external delivery" />
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

type PersistenceProofDisplay = {
  detail: string;
  label: "Checking" | "Not signed in" | "Ready" | "Save unavailable" | "Saved";
  tone: "muted" | "ready" | "success" | "warn";
};
type WorkspaceAccessDisplay = {
  detail: string;
  label: "Checked" | "Checking" | "Preview" | "Sign in";
  title: string;
  tone: "muted" | "ready" | "success" | "warn";
};
type CareNoteStatusDisplay = {
  detail: string;
  label:
    | "Cannot save note"
    | "Care note draft"
    | "Note saved"
    | "Note saved to Recent Updates"
    | "Saved care note restored"
    | "Saving note"
    | "Saving unavailable";
  tone: "muted" | "ready" | "success" | "warn";
};

function getPersistenceProofDisplay(
  permissionStatus: PermissionRuntimeStatus,
  proof: PersistenceProofState,
): PersistenceProofDisplay {
  if (permissionStatus === "loading") {
    return {
      detail: "Opening the care workspace.",
      label: "Checking",
      tone: "muted",
    };
  }

  if (permissionStatus === "auth-required") {
    return {
      detail: "Sign in to check saved workspace updates.",
      label: "Not signed in",
      tone: "warn",
    };
  }

  if (permissionStatus === "unconfigured" || permissionStatus === "error") {
    return {
      detail: "Local beta preview is available without saved updates.",
      label: "Save unavailable",
      tone: "warn",
    };
  }

  switch (proof.status) {
    case "saving":
      return {
        detail: proof.detail,
        label: "Checking",
        tone: "muted",
      };
    case "saved":
      return {
        detail: proof.detail,
        label: "Saved",
        tone: "ready",
      };
    case "read-back":
      return {
        detail: proof.detail,
        label: "Saved",
        tone: "success",
      };
    case "unavailable":
      return {
        detail: proof.detail,
        label: "Save unavailable",
        tone: "warn",
      };
    case "idle":
      return {
        detail: "Saved updates appear here when available.",
        label: "Ready",
        tone: "ready",
      };
  }
}

function getWorkspaceAccessDisplay(permissions: {
  activeCareRecipientId: string | null;
  activeCareTeamId: string | null;
  appUserId: string | null;
  isBetaPreviewWorkspace: boolean;
  status: PermissionRuntimeStatus;
}): WorkspaceAccessDisplay {
  if (permissions.status === "loading") {
    return {
      detail: "Opening your authorized workspace.",
      label: "Checking",
      title: "Authorized workspace checking",
      tone: "muted",
    };
  }

  if (permissions.status === "auth-required") {
    return {
      detail: "Sign in to check workspace access.",
      label: "Sign in",
      title: "Workspace preview",
      tone: "warn",
    };
  }

  if (permissions.status === "unconfigured" || permissions.status === "error") {
    return {
      detail: "Local beta preview is available without a connected workspace.",
      label: "Preview",
      title: "Workspace check unavailable",
      tone: "warn",
    };
  }

  const boundaryReady = Boolean(
    permissions.activeCareRecipientId && permissions.activeCareTeamId && permissions.appUserId,
  );

  if (!boundaryReady) {
    return {
      detail: "Local beta preview is available without a connected workspace.",
      label: "Preview",
      title: "Workspace preview",
      tone: "warn",
    };
  }

  if (permissions.isBetaPreviewWorkspace) {
    return {
      detail: "Authorized beta workspace preview is ready.",
      label: "Checked",
      title: "Beta workspace ready",
      tone: "success",
    };
  }

  return {
    detail: "Last checked through your authorized workspace.",
    label: "Checked",
    title: "Care workspace ready",
    tone: "success",
  };
}

function getCareNoteStatusDisplay(state: CareNoteSaveState): CareNoteStatusDisplay | null {
  switch (state.status) {
    case "draft":
      return {
        detail: "Not saved yet.",
        label: "Care note draft",
        tone: "muted",
      };
    case "saving":
      return {
        detail: "Checking the care workspace before saving.",
        label: "Saving note",
        tone: "muted",
      };
    case "saved":
      return {
        detail: "Saved without showing note text in status.",
        label: "Note saved",
        tone: "ready",
      };
    case "read-back":
      return {
        detail: "Saved to this workspace.",
        label: "Note saved to Recent Updates",
        tone: "success",
      };
    case "restored":
      return {
        detail: "Recent Updates includes saved care notes for this workspace.",
        label: "Saved care note restored",
        tone: "success",
      };
    case "unavailable":
      return {
        detail: "This note is visible in this session, but has not been saved for reload.",
        label: "Saving unavailable",
        tone: "warn",
      };
    case "denied":
      return {
        detail: "Access changed. The note was not saved.",
        label: "Cannot save note",
        tone: "warn",
      };
    case "idle":
      return null;
  }
}

function WorkspaceAccessCard({ state }: { state: WorkspaceAccessDisplay }) {
  const toneClass =
    state.tone === "success"
      ? "bg-sage text-sage-foreground"
      : state.tone === "ready"
        ? "bg-sky text-sky-foreground"
        : state.tone === "warn"
          ? "bg-sand text-sand-foreground"
          : "bg-secondary text-muted-foreground";

  return (
    <div className="card-soft px-4 py-3" aria-live="polite">
      <div className="flex gap-3">
        <span
          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClass}`}
        >
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold">{state.title}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {releaseScope}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {state.detail}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}
            >
              {state.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersistenceProofCard({ state }: { state: PersistenceProofDisplay }) {
  const toneClass =
    state.tone === "success"
      ? "bg-sage text-sage-foreground"
      : state.tone === "ready"
        ? "bg-sky text-sky-foreground"
        : state.tone === "warn"
          ? "bg-sand text-sand-foreground"
          : "bg-secondary text-muted-foreground";

  return (
    <div className="card-soft px-4 py-3" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Save status
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{state.detail}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}>
          {state.label}
        </span>
      </div>
    </div>
  );
}

function CareTimelineConfidenceCard() {
  return (
    <div className="card-soft px-4 py-3" aria-live="polite">
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage text-sage-foreground">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">Logged to the care timeline</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            This update is included in Recent Updates and Visit Prep. For coordination only.
          </p>
        </div>
      </div>
    </div>
  );
}

function CareNoteStatusCard({ state }: { state: CareNoteStatusDisplay }) {
  const toneClass =
    state.tone === "success"
      ? "bg-sage text-sage-foreground"
      : state.tone === "ready"
        ? "bg-sky text-sky-foreground"
        : state.tone === "warn"
          ? "bg-sand text-sand-foreground"
          : "bg-secondary text-muted-foreground";

  return (
    <div className="mt-2.5 rounded-2xl bg-card px-3.5 py-3" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">{state.label}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{state.detail}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}>
          {state.tone === "warn" ? "Check" : "Ready"}
        </span>
      </div>
    </div>
  );
}

function CareNoteComposer({
  draft,
  error,
  noteType,
  status,
  onCancel,
  onDraftChange,
  onNoteTypeChange,
  onSubmit,
}: {
  draft: string;
  error: string | null;
  noteType: CareNoteType;
  status: CareNoteStatusDisplay | null;
  onCancel: () => void;
  onDraftChange: (value: string) => void;
  onNoteTypeChange: (value: CareNoteType) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-2xl bg-secondary px-3.5 py-3">
      <label htmlFor="today-care-note" className="text-[13px] font-semibold">
        Care note
      </label>
      <textarea
        id="today-care-note"
        value={draft}
        maxLength={CARE_NOTE_MAX_LENGTH}
        rows={4}
        onChange={(event) => onDraftChange(event.target.value)}
        className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-border bg-card px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:ring-2 focus:ring-primary"
        placeholder="Add a coordination note for Recent Updates."
      />
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">For coordination only.</p>
        <p className="shrink-0 text-[11px] text-muted-foreground">
          {draft.length}/{CARE_NOTE_MAX_LENGTH}
        </p>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {CARE_NOTE_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={noteType === option.value}
            onClick={() => onNoteTypeChange(option.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${
              noteType === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-[12px] font-medium text-destructive">{error}</p>}
      {status && <CareNoteStatusCard state={status} />}

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full bg-card py-2.5 text-[13px] font-medium text-muted-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-full bg-primary py-2.5 text-[13px] font-medium text-primary-foreground"
        >
          Add note
        </button>
      </div>
    </div>
  );
}

function OperationalTimelineCard({
  careCircle,
  careNoteComposerOpen,
  careNoteDraft,
  careNoteError,
  careNoteStatus,
  careNoteType,
  filter,
  onAddNote,
  onCareNoteDraftChange,
  onCareNoteTypeChange,
  onCloseCareNoteComposer,
  onFilterChange,
  onOpenCareNoteComposer,
  onTimeframeChange,
  signals,
  summary,
  timeframe,
  timeline,
}: {
  careCircle: CareCircle;
  careNoteComposerOpen: boolean;
  careNoteDraft: string;
  careNoteError: string | null;
  careNoteStatus: CareNoteStatusDisplay | null;
  careNoteType: CareNoteType;
  filter: TimelineFilter;
  onAddNote: () => void;
  onCareNoteDraftChange: (value: string) => void;
  onCareNoteTypeChange: (value: CareNoteType) => void;
  onCloseCareNoteComposer: () => void;
  onFilterChange: (filter: TimelineFilter) => void;
  onOpenCareNoteComposer: () => void;
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
          { label: "Status", value: "medications" },
          { label: "Check-in", value: "vitals" },
          { label: "Notes", value: "notes" },
          { label: "Vault", value: "artifacts" },
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

      <div className="mt-3">
        {careNoteComposerOpen ? (
          <CareNoteComposer
            draft={careNoteDraft}
            error={careNoteError}
            noteType={careNoteType}
            status={careNoteStatus}
            onCancel={onCloseCareNoteComposer}
            onDraftChange={onCareNoteDraftChange}
            onNoteTypeChange={onCareNoteTypeChange}
            onSubmit={onAddNote}
          />
        ) : (
          <>
            <button
              onClick={onOpenCareNoteComposer}
              className="w-full rounded-full bg-secondary py-2.5 text-[13px] font-medium text-primary"
            >
              Preview caregiver note
            </button>
            {careNoteStatus && <CareNoteStatusCard state={careNoteStatus} />}
          </>
        )}
      </div>

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
              <p className="mt-1 text-[11px] text-muted-foreground">Family care update</p>
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
        These are care coordination reminders only.
      </p>
    </div>
  );
}

function formatSignalKind(kind: ContinuitySignal["kind"]) {
  switch (kind) {
    case "medication-gap":
      return "Care status";
    case "vitals-gap":
      return "Check-in";
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
  signals,
  summary,
  timeframe,
}: {
  careProfile: CareProfile;
  signals: ContinuitySignal[];
  summary: ProviderSummary;
  timeframe: TimeframePreset;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Care prep overview</p>
          <p className="text-[12px] text-muted-foreground">
            {formatTimeframeLabel({ filter: "all", timeframe })}
          </p>
        </div>
        <span className="rounded-full bg-sky px-2.5 py-1 text-[11px] font-medium text-sky-foreground">
          Internal
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

      <div className="mt-3 rounded-2xl bg-secondary p-3.5">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[13px] font-semibold">Internal prep view</p>
            <p className="text-[11px] text-muted-foreground">
              Built from recent care updates for in-app coordination only.
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-card px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Evidence source
            </p>
            <p className="mt-1 text-[12px] leading-relaxed">
              Recent status, notes, and approved Vault placeholder categories.
            </p>
          </div>
          <div className="rounded-2xl bg-card px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Boundary
            </p>
            <p className="mt-1 text-[12px] leading-relaxed">
              This preview stays inside Evernest during beta.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <PrivacyPill label="Internal preview only" />
          <PrivacyPill label="No external delivery" />
        </div>
      </div>
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
          Before continuing
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
          dose: "Hidden for beta preview",
          frequency: "Schedule hidden",
          id: `medicationCategory-${Date.now()}`,
          name: "Care status category",
          reminderTime: "Hidden",
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
        title="Care status"
        subtitle="Category status and reviewed updates."
        onClose={onClose}
        tone="bg-blush text-blush-foreground"
        action={
          <button
            onClick={() => setShowAddMedication((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Add care status"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />
      <div className="px-4 pb-4 space-y-4">
        {showAddMedication && (
          <div className="rounded-2xl bg-secondary p-3.5">
            <p className="text-[13px] font-semibold">Add care status category</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Field label="Category" value="Care status category" />
              <Field label="Status" value="Hidden for beta preview" />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <Field label="Cadence" value="Hidden for beta preview" />
              <Field label="Prompt" value="Hidden" />
            </div>
            <button
              onClick={scheduleMedication}
              className="mt-3 w-full rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground"
            >
              Add status
            </button>
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Review next
          </p>
          <div className="mt-2 space-y-2.5">
            {healthEventState.medications.map((medication) => {
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
                    <p className="text-[14px] font-medium">Care status category</p>
                    <p className="text-[12px] text-muted-foreground">
                      Details hidden for beta preview
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
                    {isTaken ? "Reviewed" : "Review"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Status history
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
            Care status updated
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
    selectedVital === "bp"
      ? "status category"
      : selectedVital === "hr"
        ? "pulse category"
        : "trend category";
  const addReading = () => {
    onEvent(
      createVitalsRecordedEvent({
        reading: createVitalsReading("Logged", 0, 0, "Hidden", "Content-free beta preview"),
      }),
    );
    onSave();
    setShowAddReading(false);
  };
  return (
    <div className="card-soft border hairline overflow-hidden">
      <PanelHeader
        icon={Activity}
        title="Check-in status"
        subtitle="Category status and readiness setup."
        onClose={onClose}
        tone="bg-sage text-sage-foreground"
        action={
          <button
            onClick={() => setShowAddReading((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label="Add check-in status"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />
      <div className="px-4 pb-4 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Select a category
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            <VitalSelector
              active={selectedVital === "bp"}
              label="Status category"
              onClick={() => setSelectedVital("bp")}
              value="Hidden"
              trend="Logged"
              tone="sage"
            />
            <VitalSelector
              active={selectedVital === "hr"}
              label="Signal category"
              onClick={() => setSelectedVital("hr")}
              value="Hidden"
              trend="Logged"
              tone="sky"
            />
            <VitalSelector
              active={selectedVital === "weight"}
              label="Trend category"
              onClick={() => setSelectedVital("weight")}
              value="Hidden"
              trend="Logged"
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
                <Field label="First status" value="Hidden for beta preview" />
                <Field label="Second status" value="Hidden for beta preview" />
              </div>
            )}
            {selectedVital === "hr" && (
              <div className="mt-3">
                <Field label="Signal category" value="Hidden for beta preview" />
              </div>
            )}
            {selectedVital === "weight" && (
              <div className="mt-3">
                <Field label="Trend category" value="Hidden for beta preview" />
              </div>
            )}
            <label className="mt-2.5 block rounded-2xl bg-card px-3.5 py-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Context
              </span>
              <textarea
                className="mt-1 min-h-16 w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
                placeholder="Context hidden for beta preview"
              />
            </label>
            <button
              onClick={addReading}
              className="mt-3 w-full rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground"
            >
              Add status
            </button>
          </div>
        )}

        <RecentHealthEvents
          events={healthEventState.events.filter((event) => event.type === "VitalsRecordedEvent")}
          medications={healthEventState.medications}
          title="Check-in history"
        />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Connection readiness
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
            Future connections require reviewed setup before importing data. Keep details out of
            notifications and logs.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-2xl bg-sage px-3.5 py-2.5 text-[13px] font-medium text-sage-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Check-in status updated
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
  const selectedLabel =
    selectedVital === "bp"
      ? "Status category"
      : selectedVital === "hr"
        ? "Signal category"
        : "Trend category";

  return (
    <div className="rounded-2xl bg-secondary p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">{selectedLabel}</p>
          <p className="text-[12px] text-muted-foreground">
            Details are summarized for beta preview.
          </p>
        </div>
        <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          Content-free
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <VitalsStatusTile label="Recorded" value={String(readings.length)} />
        <VitalsStatusTile label="Display" value="Hidden" />
        <VitalsStatusTile label="Evidence" value="Safe" />
      </div>
    </div>
  );
}

function VitalsStatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-medium">{value}</p>
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
        {events.slice(0, 3).map((event, index) => (
          <div key={`${event.id}-${index}`} className="rounded-2xl bg-secondary px-3.5 py-3">
            <p className="text-[13px] font-medium">{describeHealthEvent(event, medications)}</p>
            <p className="text-[12px] text-muted-foreground">
              {describeActor(event)} · {event.createdAt}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Family care update</p>
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
  onAction,
}: {
  tone: "warn" | "info";
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action: string;
  onAction: () => void;
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
      <button
        onClick={onAction}
        className="text-[12px] font-medium text-primary px-3 py-1.5 rounded-full bg-secondary"
      >
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
