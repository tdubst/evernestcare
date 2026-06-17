import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Paperclip,
  Plus,
  RotateCw,
  Shield,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import { usePermissions } from "@/lib/permissions/permission-context";
import {
  attachVaultArtifactToTimeline,
  createVaultArtifactPlaceholder,
  getArtifactAccessAdvisorySummary,
  getVaultArtifactSummary,
  listVaultArtifacts,
  type VaultArtifactAdvisory,
  type VaultArtifactCategory,
  type VaultArtifactProjection,
  type VaultArtifactStatus,
  type VaultArtifactSummary,
  type VaultArtifactVisibility,
} from "@/lib/persistence/vault-artifacts-repository";

export const Route = createFileRoute("/_tabs/vault")({
  head: () => ({ meta: [{ title: "Vault - Evernest Care" }] }),
  component: Vault,
});

type ActionState =
  | { status: "idle" }
  | { detail: string; status: "loading"; title: string }
  | { detail: string; status: "ready"; title: string }
  | { detail: string; status: "warn"; title: string };

const ARTIFACT_OPTIONS = [
  { label: "Care document", value: "care_document" },
  { label: "Medication photo", value: "medication_photo" },
  { label: "Insurance card", value: "insurance_card" },
  { label: "Referral", value: "referral" },
  { label: "Instructions", value: "instructions" },
  { label: "Other", value: "other" },
] satisfies { label: string; value: VaultArtifactCategory }[];

const VISIBILITY_OPTIONS = [
  {
    description: "Visible to approved family workspace access.",
    label: "Family visible",
    value: "family_visible",
  },
  {
    description: "Available only where the signed-in workspace allows it.",
    label: "Private",
    value: "private",
  },
] satisfies { description: string; label: string; value: VaultArtifactVisibility }[];

const CAPABILITY_LABELS: Record<string, string> = {
  "document.manage": "Manage placeholders",
  "document.upload": "Add placeholders",
  "document.view": "View placeholders",
};

function Vault() {
  const { client } = useAuth();
  const permissions = usePermissions();
  const [advisory, setAdvisory] = useState<VaultArtifactAdvisory>({
    capabilityKeys: [],
    permissionVersion: null,
    status: "unavailable",
  });
  const [summary, setSummary] = useState<VaultArtifactSummary>({
    capabilityKeys: [],
    count: 0,
    permissionVersion: null,
    result: null,
    status: "unavailable",
  });
  const [artifacts, setArtifacts] = useState<VaultArtifactProjection[]>([]);
  const [actionState, setActionState] = useState<ActionState>({ status: "idle" });
  const [artifactCategory, setArtifactCategory] = useState<VaultArtifactCategory>("care_document");
  const [visibilityCategory, setVisibilityCategory] =
    useState<VaultArtifactVisibility>("family_visible");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const permissionVersion = summary.permissionVersion ?? advisory.permissionVersion;
  const signedInReady = permissions.status === "ready" && Boolean(client);
  const canAddArtifact = advisory.capabilityKeys.includes("document.upload");
  const canViewArtifacts = advisory.capabilityKeys.includes("document.view");

  const refreshVault = useCallback(async () => {
    if (!client || permissions.status !== "ready") {
      setAdvisory({
        capabilityKeys: [],
        permissionVersion: null,
        status: permissions.status === "unconfigured" ? "unavailable" : "boundary_unavailable",
      });
      setSummary({
        capabilityKeys: [],
        count: 0,
        permissionVersion: null,
        result: null,
        status: permissions.status === "unconfigured" ? "unavailable" : "boundary_unavailable",
      });
      setArtifacts([]);
      return;
    }

    setRefreshing(true);

    const advisoryResult = await getArtifactAccessAdvisorySummary({ client });
    setAdvisory(advisoryResult);

    if (!advisoryResult.capabilityKeys.includes("document.view")) {
      setSummary({
        capabilityKeys: advisoryResult.capabilityKeys,
        count: 0,
        permissionVersion: advisoryResult.permissionVersion,
        result: null,
        status: advisoryResult.status === "ready" ? "denied" : advisoryResult.status,
      });
      setArtifacts([]);
      setRefreshing(false);
      return;
    }

    const [summaryResult, artifactRows] = await Promise.all([
      getVaultArtifactSummary({
        client,
        permissionVersion: advisoryResult.permissionVersion ?? permissions.permissionVersion,
      }),
      listVaultArtifacts({
        client,
        permissionVersion: advisoryResult.permissionVersion ?? permissions.permissionVersion,
      }),
    ]);

    setSummary(summaryResult);
    setArtifacts(
      artifactRows.filter(
        (artifact) => artifact.status === "ready" && artifact.result === "available",
      ),
    );
    setRefreshing(false);
  }, [client, permissions.permissionVersion, permissions.status]);

  useEffect(() => {
    void refreshVault();
  }, [refreshVault]);

  const statusDisplay = useMemo(
    () =>
      getVaultStatusDisplay({
        canAddArtifact,
        canViewArtifacts,
        permissionStatus: permissions.status,
        summaryStatus: summary.status,
      }),
    [canAddArtifact, canViewArtifacts, permissions.status, summary.status],
  );

  const addArtifact = () => {
    if (!client || !signedInReady) {
      setActionState({
        detail: "Vault access is not available for this workspace.",
        status: "warn",
        title: "Saving unavailable",
      });
      return;
    }

    if (!canAddArtifact) {
      setActionState({
        detail: "Access changed. Vault details are unavailable.",
        status: "warn",
        title: "Cannot add placeholder",
      });
      return;
    }

    setActionState({
      detail: "Checking the care workspace before adding.",
      status: "loading",
      title: "Adding placeholder",
    });

    void createVaultArtifactPlaceholder({
      artifactCategory,
      client,
      permissionVersion,
      visibilityCategory,
    }).then((result) => {
      setActionState(getActionStateFromStatus(result.status, "Placeholder added."));

      if (result.status === "created" || result.status === "duplicate_request") {
        setIsSheetOpen(false);
        void refreshVault();
      }
    });
  };

  const attachArtifact = (artifact: VaultArtifactProjection) => {
    if (!client || !artifact.artifactAlias || !canAddArtifact) {
      setActionState({
        detail: "Access changed. Vault details are unavailable.",
        status: "warn",
        title: "Cannot link placeholder",
      });
      return;
    }

    setActionState({
      detail: "Checking the care workspace before linking.",
      status: "loading",
      title: "Linking placeholder",
    });

    void attachVaultArtifactToTimeline({
      artifactAlias: artifact.artifactAlias,
      client,
      permissionVersion,
    }).then((result) => {
      setActionState(getActionStateFromStatus(result.status, "Linked to care timeline."));

      if (result.status === "attached" || result.status === "duplicate_request") {
        void refreshVault();
      }
    });
  };

  return (
    <div className="pb-8">
      <header className="px-6 pt-14 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">Vault</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Continuity memory for care documents and photos.
            </p>
          </div>
          <button
            onClick={() => void refreshVault()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"
            aria-label="Refresh Vault"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <section className="px-6 mt-4">
        <StatusCard
          detail={statusDisplay.detail}
          icon={statusDisplay.icon}
          tone={statusDisplay.tone}
          title={statusDisplay.title}
        />
      </section>

      {actionState.status !== "idle" && (
        <section className="px-6 mt-3">
          <ActionStatusCard state={actionState} />
        </section>
      )}

      <section className="px-6 mt-5">
        <div className="card-soft p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Document placeholders</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {summary.count === 0
                  ? "No placeholders yet"
                  : `${summary.count} ${summary.count === 1 ? "placeholder" : "placeholders"}`}
              </p>
            </div>
            <button
              onClick={() => setIsSheetOpen(true)}
              disabled={!signedInReady || !canAddArtifact}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add placeholder
            </button>
          </div>
        </div>
      </section>

      <section className="px-6 mt-5">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Updates
        </h2>
        {artifacts.length === 0 ? (
          <div className="card-soft p-5 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-[15px] font-medium">No placeholders yet</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Add a placeholder when this workspace is ready.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {artifacts.map((artifact, index) => (
              <ArtifactCard
                artifact={artifact}
                canAttach={canAddArtifact}
                key={`${artifact.artifactAlias ?? "artifact"}-${artifact.artifactCategory ?? "unknown"}-${index}`}
                onAttach={() => attachArtifact(artifact)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="px-6 mt-5">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Access advisory
        </h2>
        <div className="card-soft divide-y hairline overflow-hidden">
          {["document.view", "document.upload", "document.manage"].map((capabilityKey) => (
            <CapabilityRow
              allowed={advisory.capabilityKeys.includes(capabilityKey)}
              capabilityKey={capabilityKey}
              key={capabilityKey}
            />
          ))}
        </div>
      </section>

      {isSheetOpen && (
        <AddArtifactSheet
          artifactCategory={artifactCategory}
          onAdd={addArtifact}
          onCategoryChange={setArtifactCategory}
          onClose={() => setIsSheetOpen(false)}
          onVisibilityChange={setVisibilityCategory}
          saving={actionState.status === "loading"}
          visibilityCategory={visibilityCategory}
        />
      )}
    </div>
  );
}

function StatusCard({
  detail,
  icon: Icon,
  title,
  tone,
}: {
  detail: string;
  icon: LucideIcon;
  title: string;
  tone: string;
}) {
  return (
    <div className="card-soft flex items-start gap-3 p-4">
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function ActionStatusCard({ state }: { state: Exclude<ActionState, { status: "idle" }> }) {
  const tone =
    state.status === "ready"
      ? "bg-sage text-sage-foreground"
      : state.status === "warn"
        ? "bg-blush text-blush-foreground"
        : "bg-sky text-sky-foreground";

  return (
    <div className="card-soft flex items-start gap-3 p-4">
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}
      >
        {state.status === "loading" ? (
          <Clock3 className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
      </span>
      <div>
        <p className="text-[14px] font-medium">{state.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{state.detail}</p>
      </div>
    </div>
  );
}

function ArtifactCard({
  artifact,
  canAttach,
  onAttach,
}: {
  artifact: VaultArtifactProjection;
  canAttach: boolean;
  onAttach: () => void;
}) {
  const attached = artifact.attachmentStatus === "attached";

  return (
    <div className="card-soft p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky text-sky-foreground">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">
            {formatArtifactCategory(artifact.artifactCategory)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <PillLabel label={formatVisibility(artifact.visibilityCategory)} />
            <PillLabel label={attached ? "Linked to care timeline" : "Not linked"} />
            <PillLabel label={formatTimeBucket(artifact.createdTimeBucket)} />
          </div>
        </div>
      </div>
      {!attached && (
        <button
          onClick={onAttach}
          disabled={!canAttach}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary px-4 py-3 text-[13px] font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4" />
          Link to care timeline
        </button>
      )}
    </div>
  );
}

function PillLabel({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function CapabilityRow({ allowed, capabilityKey }: { allowed: boolean; capabilityKey: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[14px] font-medium">
          {CAPABILITY_LABELS[capabilityKey] ?? "Workspace access"}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Advisory workspace check</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
          allowed ? "bg-sage text-sage-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        {allowed ? "Ready" : "Unavailable"}
      </span>
    </div>
  );
}

function AddArtifactSheet({
  artifactCategory,
  onAdd,
  onCategoryChange,
  onClose,
  onVisibilityChange,
  saving,
  visibilityCategory,
}: {
  artifactCategory: VaultArtifactCategory;
  onAdd: () => void;
  onCategoryChange: (value: VaultArtifactCategory) => void;
  onClose: () => void;
  onVisibilityChange: (value: VaultArtifactVisibility) => void;
  saving: boolean;
  visibilityCategory: VaultArtifactVisibility;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl bg-card p-6 pb-10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="h-1 w-10 rounded-full bg-muted" />
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-[22px] font-semibold tracking-tight">Add document placeholder</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Add a safe placeholder so the care team knows a document exists.
        </p>

        <fieldset className="mt-5">
          <legend className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Placeholder category
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ARTIFACT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onCategoryChange(option.value)}
                type="button"
                className={`rounded-2xl border px-3 py-3 text-left text-[13px] font-medium ${
                  artifactCategory === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hairline bg-secondary text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Visibility category
          </legend>
          <div className="mt-3 space-y-2">
            {VISIBILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onVisibilityChange(option.value)}
                type="button"
                className={`w-full rounded-2xl border px-3.5 py-3 text-left ${
                  visibilityCategory === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hairline bg-secondary text-foreground"
                }`}
              >
                <span className="block text-[13px] font-medium">{option.label}</span>
                <span className="mt-1 block text-[11px] opacity-80">{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            onClick={onClose}
            className="rounded-full bg-secondary px-4 py-3 text-[14px] font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            disabled={saving}
            className="rounded-full bg-primary px-4 py-3 text-[14px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add document placeholder
          </button>
        </div>
      </div>
    </div>
  );
}

function getActionStateFromStatus(status: VaultArtifactStatus, successTitle: string): ActionState {
  if (status === "created" || status === "attached" || status === "duplicate_request") {
    return {
      detail:
        status === "attached" || successTitle === "Linked to care timeline."
          ? "Linked to care timeline."
          : "Placeholder added.",
      status: "ready",
      title: successTitle,
    };
  }

  if (status === "denied" || status === "stale_permission_context") {
    return {
      detail: "Access changed. Vault details are unavailable.",
      status: "warn",
      title: "Cannot update Vault",
    };
  }

  return {
    detail: "Vault is unavailable. Try again later.",
    status: "warn",
    title: "Vault unavailable",
  };
}

function getVaultStatusDisplay({
  canAddArtifact,
  canViewArtifacts,
  permissionStatus,
  summaryStatus,
}: {
  canAddArtifact: boolean;
  canViewArtifacts: boolean;
  permissionStatus: string;
  summaryStatus: VaultArtifactStatus;
}): { detail: string; icon: LucideIcon; title: string; tone: string } {
  if (permissionStatus === "loading") {
    return {
      detail: "Checking the signed-in care workspace.",
      icon: Clock3,
      title: "Checking Vault access",
      tone: "bg-sky text-sky-foreground",
    };
  }

  if (permissionStatus !== "ready") {
    return {
      detail: "Vault access is not available for this workspace.",
      icon: Shield,
      title: "Vault unavailable",
      tone: "bg-blush text-blush-foreground",
    };
  }

  if (summaryStatus === "denied" || summaryStatus === "stale_permission_context") {
    return {
      detail: "Access changed. Vault details are unavailable.",
      icon: Shield,
      title: "Vault access unavailable",
      tone: "bg-blush text-blush-foreground",
    };
  }

  if (canViewArtifacts || canAddArtifact) {
    return {
      detail: "Last checked through your signed-in workspace.",
      icon: CheckCircle2,
      title: "Vault workspace ready",
      tone: "bg-sage text-sage-foreground",
    };
  }

  return {
    detail: "Vault access is not available for this workspace.",
    icon: Shield,
    title: "Vault unavailable",
    tone: "bg-blush text-blush-foreground",
  };
}

function formatArtifactCategory(value: VaultArtifactCategory | null): string {
  return ARTIFACT_OPTIONS.find((option) => option.value === value)?.label ?? "Document placeholder";
}

function formatVisibility(value: VaultArtifactVisibility | null): string {
  return VISIBILITY_OPTIONS.find((option) => option.value === value)?.label ?? "Workspace visible";
}

function formatTimeBucket(value: string | null): string {
  if (value === "today") return "Today";
  if (value === "this_week") return "This week";
  if (value === "earlier") return "Earlier";
  return "Recently added";
}
