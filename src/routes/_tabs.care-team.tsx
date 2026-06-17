import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock3,
  Eye,
  RotateCw,
  Shield,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import {
  BETA_DEMO_CARE_CIRCLE_INVITATIONS,
  BETA_DEMO_CARE_CIRCLE_PERMISSIONS,
  BETA_DEMO_CARE_CIRCLE_SUMMARY,
  BETA_DEMO_INVITE_PREVIEW,
} from "@/lib/beta-demo-workspace";
import {
  acceptCareCircleInvitation,
  createCareCircleInvitation,
  denyCareCircleInvitation,
  expireCareCircleInvitation,
  expireCareCircleInvitations,
  getCareCircleSummary,
  getPermissionsAdvisorySummary,
  listCareCircleInvitations,
  previewCareCircleInvitation,
  revokeCareCircleInvitation,
  type CareCircleCapabilityCategory,
  type CareCircleInvitationSummary,
  type CareCircleMemberSummary,
  type CareCirclePermissionSummary,
  type CareCirclePreviewResult,
  type CareCircleRpcStatus,
  type CareCircleSummaryResult,
} from "@/lib/permissions/care-circle-repository";
import { usePermissions } from "@/lib/permissions/permission-context";

export const Route = createFileRoute("/_tabs/care-team")({
  head: () => ({ meta: [{ title: "Care Circle - Evernest Care" }] }),
  component: CareTeam,
});

type InviteRoleKey = "family_member" | "viewer";
type SheetState = "invite" | "review" | null;
type ActionState =
  | { status: "idle" }
  | { detail: string; status: "loading"; title: string }
  | { detail: string; status: "ready"; title: string }
  | { detail: string; status: "warn"; title: string };
type ConfirmAction = { invitation: CareCircleInvitationSummary; kind: "expire" | "revoke" } | null;

const INVITE_ROLE_OPTIONS = [
  {
    description: "Can help coordinate family updates.",
    label: "Family coordinator",
    value: "family_member",
  },
  {
    description: "Can view updates with limited coordination.",
    label: "Care viewer",
    value: "viewer",
  },
] satisfies { description: string; label: string; value: InviteRoleKey }[];

const DEFAULT_EXPIRES_IN_DAYS = 7;

function CareTeam() {
  const { client } = useAuth();
  const permissions = usePermissions();
  const [summary, setSummary] = useState<CareCircleSummaryResult>({ status: "unavailable" });
  const [permissionsSummary, setPermissionsSummary] = useState<CareCirclePermissionSummary[]>([]);
  const [inboundInvitations, setInboundInvitations] = useState<CareCircleInvitationSummary[]>([]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [inviteAddress, setInviteAddress] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRoleKey>("family_member");
  const [preview, setPreview] = useState<CareCirclePreviewResult>({ status: "unavailable" });
  const [actionState, setActionState] = useState<ActionState>({ status: "idle" });
  const [refreshing, setRefreshing] = useState(false);

  const permissionVersion =
    summary.status === "ready" ? summary.permissionVersion : permissions.permissionVersion;
  const circleMembers = summary.status === "ready" ? summary.careCircle : [];
  const pendingInvitations = summary.status === "ready" ? summary.pendingInvitations : [];
  const advisoryPermissions =
    permissionsSummary.length > 0
      ? permissionsSummary
      : summary.status === "ready"
        ? summary.advisoryPermissions
        : [];
  const canManageInvitations = advisoryPermissions.some(
    (item) => item.capabilityKey === "invitation.manage" && item.accessState === "allowed",
  );
  const signedInReady =
    permissions.status === "ready" && (Boolean(client) || permissions.isBetaPreviewWorkspace);

  const refreshCareCircle = useCallback(async () => {
    if (permissions.isBetaPreviewWorkspace) {
      setSummary(BETA_DEMO_CARE_CIRCLE_SUMMARY);
      setPermissionsSummary(BETA_DEMO_CARE_CIRCLE_PERMISSIONS);
      setInboundInvitations([]);
      setRefreshing(false);
      return;
    }

    if (!client || permissions.status !== "ready") {
      setSummary({
        status: permissions.status === "unconfigured" ? "unavailable" : "auth_required",
      });
      setPermissionsSummary([]);
      setInboundInvitations([]);
      return;
    }

    setRefreshing(true);

    const [summaryResult, advisoryResult, invitationResult] = await Promise.all([
      getCareCircleSummary({ client }),
      getPermissionsAdvisorySummary({ client }),
      listCareCircleInvitations({ client }),
    ]);

    setSummary(summaryResult);
    setPermissionsSummary(
      advisoryResult.status === "ready" ? advisoryResult.advisoryPermissions : [],
    );
    setInboundInvitations(invitationResult.status === "ready" ? invitationResult.invitations : []);
    setRefreshing(false);
  }, [client, permissions.isBetaPreviewWorkspace, permissions.status]);

  useEffect(() => {
    void refreshCareCircle();
  }, [refreshCareCircle]);

  const activeInvitationCount = pendingInvitations.filter(
    (item) => item.inviteStatus === "pending",
  ).length;
  const statusDisplay = getRouteStatusDisplay({
    canManageInvitations,
    memberCount: circleMembers.length,
    permissionStatus: permissions.status,
    summaryStatus: summary.status,
  });

  const previewInvite = () => {
    if (permissions.isBetaPreviewWorkspace) {
      setPreview(BETA_DEMO_INVITE_PREVIEW);
      setActionState({
        detail: "Invite preview ready for this beta workspace.",
        status: "ready",
        title: "Invite preview ready",
      });
      return;
    }

    if (!client || permissions.status !== "ready") {
      setActionState({
        detail: "Sign in to review invitation access.",
        status: "warn",
        title: "Cannot preview invite",
      });
      return;
    }

    setActionState({
      detail: "Checking role and audience before creating an invite.",
      status: "loading",
      title: "Reviewing invite",
    });

    void previewCareCircleInvitation({
      client,
      expiresInDays: DEFAULT_EXPIRES_IN_DAYS,
      permissionVersion,
      roleKey: inviteRole,
    }).then((result) => {
      setPreview(result);
      setActionState(getActionStateFromStatus(result.status, "Invite preview ready"));
    });
  };

  const sendInvite = () => {
    const trimmedAddress = inviteAddress.trim();

    if (!trimmedAddress || !trimmedAddress.includes("@")) {
      setActionState({
        detail: "Add an invite address before sending.",
        status: "warn",
        title: "Invite address needed",
      });
      return;
    }

    if (permissions.isBetaPreviewWorkspace) {
      setActionState({
        detail: "Invite preview was prepared without sending a real invitation.",
        status: "ready",
        title: "Invite preview ready",
      });
      setInviteAddress("");
      setSheet(null);
      setSummary({
        ...BETA_DEMO_CARE_CIRCLE_SUMMARY,
        pendingInvitations: BETA_DEMO_CARE_CIRCLE_INVITATIONS,
      });
      return;
    }

    if (!client || permissions.status !== "ready") {
      setActionState({
        detail: "Access changed. The invite was not created.",
        status: "warn",
        title: "Cannot create invite",
      });
      return;
    }

    setActionState({
      detail: "Creating an invite through the signed-in care workspace.",
      status: "loading",
      title: "Sending invite",
    });

    void createCareCircleInvitation({
      client,
      expiresInDays: DEFAULT_EXPIRES_IN_DAYS,
      invitedEmail: trimmedAddress,
      permissionVersion,
      roleKey: inviteRole,
    }).then((result) => {
      setActionState(getActionStateFromStatus(result.status, "Invite pending"));

      if (result.status === "created" || result.status === "duplicate_request") {
        setInviteAddress("");
        setSheet(null);
        void refreshCareCircle();
      }
    });
  };

  const resolveInvitation = ({
    invitation,
    kind,
  }: {
    invitation: CareCircleInvitationSummary;
    kind: "accept" | "deny";
  }) => {
    if (!client) return;

    setActionState({
      detail: "Checking invitation status before updating.",
      status: "loading",
      title: kind === "accept" ? "Accepting invite" : "Denying invite",
    });

    const request =
      kind === "accept"
        ? acceptCareCircleInvitation({ client, invitePreviewId: invitation.invitePreviewId })
        : denyCareCircleInvitation({ client, invitePreviewId: invitation.invitePreviewId });

    void request.then((result) => {
      setActionState(
        getActionStateFromStatus(
          result.status,
          kind === "accept" ? "Invite accepted" : "Invite denied",
        ),
      );
      void refreshCareCircle();
    });
  };

  const updateInvitation = () => {
    if (!confirmAction) return;

    const { invitation, kind } = confirmAction;

    if (permissions.isBetaPreviewWorkspace) {
      setConfirmAction(null);
      setSummary((current) =>
        current.status === "ready"
          ? {
              ...current,
              pendingInvitations: current.pendingInvitations.map((item) =>
                item.invitePreviewId === invitation.invitePreviewId
                  ? { ...item, inviteStatus: kind === "revoke" ? "revoked" : "expired" }
                  : item,
              ),
            }
          : current,
      );
      setActionState({
        detail: "Invite status updated in this beta workspace preview.",
        status: "ready",
        title: kind === "revoke" ? "Invite revoked" : "Invite expired",
      });
      return;
    }

    if (!client) return;

    setActionState({
      detail: "Checking invitation status before updating.",
      status: "loading",
      title: kind === "revoke" ? "Revoking invite" : "Expiring invite",
    });

    const request =
      kind === "revoke"
        ? revokeCareCircleInvitation({
            client,
            invitePreviewId: invitation.invitePreviewId,
            permissionVersion,
          })
        : expireCareCircleInvitation({
            client,
            invitePreviewId: invitation.invitePreviewId,
            permissionVersion,
          });

    void request.then((result) => {
      setConfirmAction(null);
      setActionState(
        getActionStateFromStatus(
          result.status,
          kind === "revoke" ? "Invite revoked" : "Invite expired",
        ),
      );
      void refreshCareCircle();
    });
  };

  const expireElapsed = () => {
    if (permissions.isBetaPreviewWorkspace) {
      setActionState({
        detail: "Invite statuses refreshed in this beta workspace preview.",
        status: "ready",
        title: "Invite statuses refreshed",
      });
      return;
    }

    if (!client) return;

    setActionState({
      detail: "Checking pending invitations for elapsed expiry.",
      status: "loading",
      title: "Refreshing invite status",
    });

    void expireCareCircleInvitations({ client, permissionVersion }).then((result) => {
      setActionState(getActionStateFromStatus(result.status, "Invite statuses refreshed"));
      void refreshCareCircle();
    });
  };

  return (
    <div>
      <header className="px-6 pt-14 pb-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Care Circle</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Family coordination access from the authorized workspace.
        </p>
      </header>

      <div className="px-6 mt-3">
        <RouteStatusCard state={statusDisplay} />
      </div>

      <div className="px-6 mt-3 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => {
            setSheet("invite");
            setActionState({ status: "idle" });
            setPreview({ status: "unavailable" });
          }}
          className="card-soft p-4 text-left active:scale-[0.98] transition"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UserPlus className="h-4 w-4" />
          </span>
          <p className="mt-2.5 text-[14px] font-medium">Invite preview</p>
          <p className="text-[11px] text-muted-foreground">Preview only</p>
        </button>
        <button
          onClick={() => setSheet("review")}
          className="card-soft p-4 text-left active:scale-[0.98] transition"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sage text-sage-foreground">
            <Shield className="h-4 w-4" />
          </span>
          <p className="mt-2.5 text-[14px] font-medium">Access preview</p>
          <p className="text-[11px] text-muted-foreground">Advisory categories only</p>
        </button>
      </div>

      <Section title="Care Circle">
        {signedInReady ? (
          circleMembers.length > 0 ? (
            circleMembers.map((member, index) => (
              <MemberRow key={`${member.subjectAlias}-${index}`} member={member} />
            ))
          ) : (
            <EmptyRow
              title="No visible circle members"
              detail="Care Circle details are unavailable."
            />
          )
        ) : (
          <EmptyRow title="Workspace not ready" detail="Sign in to view Care Circle summaries." />
        )}
      </Section>

      <Section title="Invitations">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-muted-foreground">
              {activeInvitationCount} pending invite{activeInvitationCount === 1 ? "" : "s"}
            </p>
            <button
              onClick={expireElapsed}
              disabled={!canManageInvitations || !signedInReady}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[12px] font-medium text-primary disabled:text-muted-foreground"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
          {pendingInvitations.length > 0 ? (
            pendingInvitations.map((invitation, index) => (
              <InvitationRow
                key={`${invitation.inviteStatus}-${index}`}
                canManage={canManageInvitations}
                invitation={invitation}
                onConfirm={(kind) => setConfirmAction({ invitation, kind })}
              />
            ))
          ) : (
            <EmptyRow title="No visible invitations" detail="Pending states will appear here." />
          )}
        </div>
      </Section>

      <Section title="Received invites">
        {inboundInvitations.length > 0 ? (
          inboundInvitations.map((invitation, index) => (
            <InboundInvitationRow
              key={`${invitation.inviteStatus}-${index}`}
              invitation={invitation}
              onAccept={() => resolveInvitation({ invitation, kind: "accept" })}
              onDeny={() => resolveInvitation({ invitation, kind: "deny" })}
            />
          ))
        ) : (
          <EmptyRow
            title="No invite waiting"
            detail="Accepted, denied, or expired states appear here."
          />
        )}
      </Section>

      <Section title="Permissions advisory">
        {advisoryPermissions.length > 0 ? (
          advisoryPermissions.map((permission, index) => (
            <PermissionRow key={`${permission.capabilityKey}-${index}`} permission={permission} />
          ))
        ) : (
          <EmptyRow
            title="No advisory summary"
            detail="Permissions remain enforced by the workspace."
          />
        )}
      </Section>

      {actionState.status !== "idle" && (
        <div className="px-6 mt-4">
          <ActionStatusCard state={actionState} />
        </div>
      )}

      {sheet === "invite" && (
        <InviteSheet
          actionState={actionState}
          address={inviteAddress}
          canManage={canManageInvitations}
          preview={preview}
          role={inviteRole}
          onAddressChange={setInviteAddress}
          onClose={() => setSheet(null)}
          onPreview={previewInvite}
          onRoleChange={setInviteRole}
          onSend={sendInvite}
        />
      )}

      {sheet === "review" && (
        <ReviewSheet permissions={advisoryPermissions} onClose={() => setSheet(null)} />
      )}

      {confirmAction && (
        <ConfirmSheet
          kind={confirmAction.kind}
          onCancel={() => setConfirmAction(null)}
          onConfirm={updateInvitation}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { children: React.ReactNode; title: string }) {
  return (
    <section className="px-6 mt-7">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h2>
      <div className="card-soft p-4">{children}</div>
    </section>
  );
}

function RouteStatusCard({
  state,
}: {
  state: { detail: string; label: string; tone: "muted" | "ready" | "warn"; title: string };
}) {
  const toneClass = getToneClass(state.tone);
  return (
    <div className="card-soft px-4 py-3" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">{state.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{state.detail}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClass}`}>
          {state.label}
        </span>
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: CareCircleMemberSummary }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary px-3.5 py-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky text-sky-foreground text-[12px] font-semibold">
        {formatAlias(member.subjectAlias)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{formatAlias(member.subjectAlias)}</p>
        <p className="text-[12px] text-muted-foreground">
          {formatRoleCategory(member.roleCategory)} · {formatStatus(member.membershipStatus)}
        </p>
      </div>
      <StatusPill label={formatStatus(member.membershipStatus)} tone="ready" />
    </div>
  );
}

function InvitationRow({
  canManage,
  invitation,
  onConfirm,
}: {
  canManage: boolean;
  invitation: CareCircleInvitationSummary;
  onConfirm: (kind: "expire" | "revoke") => void;
}) {
  return (
    <div className="rounded-2xl bg-secondary px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">{formatRoleCategory(invitation.roleCategory)}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {formatAudience(invitation.audienceCategory)} · {formatExpiry(invitation.expiresIn)}
          </p>
        </div>
        <StatusPill
          label={formatStatus(invitation.inviteStatus)}
          tone={toneForStatus(invitation.inviteStatus)}
        />
      </div>
      <CapabilityList categories={invitation.capabilityCategories} />
      {canManage && invitation.inviteStatus === "pending" && (
        <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-border pt-3">
          <button
            onClick={() => onConfirm("expire")}
            className="rounded-full bg-card py-2 text-[12px] font-medium text-muted-foreground"
          >
            Expire
          </button>
          <button
            onClick={() => onConfirm("revoke")}
            className="rounded-full bg-sand py-2 text-[12px] font-medium text-sand-foreground"
          >
            Revoke
          </button>
        </div>
      )}
    </div>
  );
}

function InboundInvitationRow({
  invitation,
  onAccept,
  onDeny,
}: {
  invitation: CareCircleInvitationSummary;
  onAccept: () => void;
  onDeny: () => void;
}) {
  const actionable = invitation.inviteStatus === "pending";
  return (
    <div className="rounded-2xl bg-secondary px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">{formatRoleCategory(invitation.roleCategory)}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {formatAudience(invitation.audienceCategory)} · {formatStatus(invitation.inviteStatus)}
          </p>
        </div>
        <StatusPill
          label={formatStatus(invitation.inviteStatus)}
          tone={toneForStatus(invitation.inviteStatus)}
        />
      </div>
      <CapabilityList categories={invitation.capabilityCategories} />
      {actionable && (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            onClick={onDeny}
            className="rounded-full bg-card py-2 text-[12px] font-medium text-muted-foreground"
          >
            Deny
          </button>
          <button
            onClick={onAccept}
            className="rounded-full bg-primary py-2 text-[12px] font-medium text-primary-foreground"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  );
}

function PermissionRow({ permission }: { permission: CareCirclePermissionSummary }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary px-3.5 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage text-sage-foreground">
        <Shield className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{formatCapabilityKey(permission.capabilityKey)}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Advisory · {formatStatus(permission.accessState)}
        </p>
      </div>
      <StatusPill
        label={formatStatus(permission.accessState)}
        tone={toneForStatus(permission.accessState)}
      />
    </div>
  );
}

function EmptyRow({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-3.5 py-3">
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function InviteSheet({
  actionState,
  address,
  canManage,
  preview,
  role,
  onAddressChange,
  onClose,
  onPreview,
  onRoleChange,
  onSend,
}: {
  actionState: ActionState;
  address: string;
  canManage: boolean;
  preview: CareCirclePreviewResult;
  role: InviteRoleKey;
  onAddressChange: (value: string) => void;
  onClose: () => void;
  onPreview: () => void;
  onRoleChange: (value: InviteRoleKey) => void;
  onSend: () => void;
}) {
  return (
    <SheetFrame title="Invite preview" eyebrow="Care Circle" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label htmlFor="invite-address" className="text-[13px] font-semibold">
            Invite address
          </label>
          <input
            id="invite-address"
            value={address}
            type="email"
            autoComplete="off"
            onChange={(event) => onAddressChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-border bg-secondary px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <p className="text-[13px] font-semibold">Role preview</p>
          <div className="mt-2 grid gap-2">
            {INVITE_ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={role === option.value}
                onClick={() => onRoleChange(option.value)}
                className={`rounded-2xl px-3.5 py-3 text-left ${
                  role === option.value ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                <p className="text-[13px] font-semibold">{option.label}</p>
                <p
                  className={`mt-1 text-[12px] ${
                    role === option.value ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <PreviewPanel preview={preview} />
        {actionState.status !== "idle" && <ActionStatusCard state={actionState} />}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-secondary py-3 text-[14px] font-medium text-muted-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPreview}
            disabled={!canManage}
            className="rounded-full bg-card py-3 text-[14px] font-medium text-primary disabled:text-muted-foreground"
          >
            Review preview
          </button>
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={!canManage}
          className="w-full rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground disabled:bg-secondary disabled:text-muted-foreground"
        >
          Send invite
        </button>
      </div>
    </SheetFrame>
  );
}

function PreviewPanel({ preview }: { preview: CareCirclePreviewResult }) {
  if (preview.status !== "ready") {
    return (
      <div className="rounded-2xl bg-secondary px-3.5 py-3">
        <p className="text-[13px] font-semibold">Preview before sending</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Review role, audience, and expiry before creating an invite.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-secondary px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">{formatRoleCategory(preview.roleCategory)}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {formatAudience(preview.audienceCategory)} · {formatExpiry(preview.expiresIn)}
          </p>
        </div>
        <StatusPill label="Ready" tone="ready" />
      </div>
      <CapabilityList categories={preview.capabilityCategories} />
      <p className="mt-2 text-[12px] text-muted-foreground">No documents or external access.</p>
    </div>
  );
}

function ReviewSheet({
  permissions,
  onClose,
}: {
  onClose: () => void;
  permissions: CareCirclePermissionSummary[];
}) {
  return (
    <SheetFrame title="Access preview" eyebrow="Advisory permissions" onClose={onClose}>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        These categories explain what the authorized workspace reported. Server rules remain the
        authority.
      </p>
      <div className="mt-4 space-y-2.5">
        {permissions.length > 0 ? (
          permissions.map((permission, index) => (
            <PermissionRow key={`${permission.capabilityKey}-${index}`} permission={permission} />
          ))
        ) : (
          <EmptyRow title="No advisory summary" detail="Access details are unavailable." />
        )}
      </div>
      <button
        onClick={onClose}
        className="mt-5 w-full rounded-full bg-primary py-3 text-[14px] font-medium text-primary-foreground"
      >
        Close
      </button>
    </SheetFrame>
  );
}

function ConfirmSheet({
  kind,
  onCancel,
  onConfirm,
}: {
  kind: "expire" | "revoke";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <SheetFrame
      title={kind === "revoke" ? "Revoke invite" : "Expire invite"}
      eyebrow="Confirm update"
      onClose={onCancel}
    >
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        This updates the invitation state through the authorized workspace. It does not reveal
        recipient details.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          onClick={onCancel}
          className="rounded-full bg-secondary py-3 text-[14px] font-medium text-muted-foreground"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-full bg-sand py-3 text-[14px] font-medium text-sand-foreground"
        >
          {kind === "revoke" ? "Revoke" : "Expire"}
        </button>
      </div>
    </SheetFrame>
  );
}

function SheetFrame({
  children,
  eyebrow,
  onClose,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-0"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="care-circle-sheet-title"
        className="max-h-[88vh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl bg-card p-6 pb-10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-muted" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
            <h3
              id="care-circle-sheet-title"
              className="mt-1 text-[22px] font-semibold tracking-tight"
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function ActionStatusCard({ state }: { state: Exclude<ActionState, { status: "idle" }> }) {
  const tone = state.status === "warn" ? "warn" : state.status === "loading" ? "muted" : "ready";
  return (
    <div className="rounded-2xl bg-secondary px-3.5 py-3" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">{state.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{state.detail}</p>
        </div>
        <StatusPill label={state.status === "loading" ? "Checking" : "Status"} tone={tone} />
      </div>
    </div>
  );
}

function CapabilityList({ categories }: { categories: CareCircleCapabilityCategory[] }) {
  const visibleCategories =
    categories.length > 0 ? categories : [{ access: "visible", category: "care_circle" }];
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {visibleCategories.map((item, index) => (
        <span
          key={`${item.category}-${item.access}-${index}`}
          className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
        >
          {formatCapabilityCategory(item)}
        </span>
      ))}
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "muted" | "ready" | "warn" }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${getToneClass(tone)}`}
    >
      {label}
    </span>
  );
}

function getRouteStatusDisplay({
  canManageInvitations,
  memberCount,
  permissionStatus,
  summaryStatus,
}: {
  canManageInvitations: boolean;
  memberCount: number;
  permissionStatus: string;
  summaryStatus: CareCircleSummaryResult["status"];
}) {
  if (permissionStatus === "loading") {
    return {
      detail: "Checking Care Circle access.",
      label: "Checking",
      title: "Opening Care Circle",
      tone: "muted" as const,
    };
  }

  if (permissionStatus === "unconfigured") {
    return {
      detail: "Local beta preview is available without saved invitations.",
      label: "Preview",
      title: "Care Circle preview",
      tone: "warn" as const,
    };
  }

  if (permissionStatus === "auth-required") {
    return {
      detail: "Sign in to view Care Circle summaries.",
      label: "Sign in",
      title: "Care Circle not checked",
      tone: "warn" as const,
    };
  }

  if (summaryStatus !== "ready") {
    return {
      detail: getGenericStatusDetail(summaryStatus),
      label: "Unavailable",
      title: "Care Circle unavailable",
      tone: "warn" as const,
    };
  }

  return {
    detail: `${memberCount} visible ${memberCount === 1 ? "member" : "members"} · ${
      canManageInvitations ? "Invites can be managed" : "Invites are view-only"
    }.`,
    label: "Ready",
    title: "Care Circle ready",
    tone: "ready" as const,
  };
}

function getActionStateFromStatus(status: CareCircleRpcStatus, successTitle: string): ActionState {
  if (status === "ready" || status === "created" || status === "accepted") {
    return {
      detail: "Updated through the authorized workspace.",
      status: "ready",
      title: successTitle,
    };
  }

  if (status === "duplicate_request") {
    return {
      detail: "An active invite with this audience is already pending.",
      status: "ready",
      title: "Invite already pending",
    };
  }

  if (status === "denied" || status === "access_changed" || status === "stale_permission_context") {
    return {
      detail: "Access changed. The update was not saved.",
      status: "warn",
      title: "Cannot update invite",
    };
  }

  return {
    detail: getGenericStatusDetail(status),
    status: "warn",
    title: "Invite update unavailable",
  };
}

function getGenericStatusDetail(status: string) {
  switch (status) {
    case "auth_required":
      return "Sign in to continue.";
    case "boundary_unavailable":
      return "Care workspace is unavailable.";
    case "expired":
      return "The invite is expired.";
    case "revoked":
      return "The invite is revoked.";
    case "already_used":
      return "The invite was already used.";
    case "wrong_audience":
      return "The invite cannot be used by this account.";
    case "invalid_request":
      return "Check the invite details and try again.";
    default:
      return "Try again after the workspace is ready.";
  }
}

function formatAlias(value: string) {
  if (value === "current_user") return "You";
  if (value.startsWith("member_")) return `Member ${value.replace("member_", "")}`;
  return "Member";
}

function formatRoleCategory(value: string) {
  switch (value) {
    case "care_lead":
      return "Care lead";
    case "family":
      return "Family";
    case "viewer":
      return "Viewer";
    default:
      return "Limited";
  }
}

function formatAudience(value: string) {
  switch (value) {
    case "family_coordination":
      return "Care coordination";
    case "read_only_family":
      return "Family updates";
    default:
      return "Family visible";
  }
}

function formatStatus(value: string) {
  switch (value) {
    case "active":
    case "allowed":
    case "ready":
      return "Ready";
    case "accepted":
      return "Accepted";
    case "denied":
      return "Denied";
    case "expired":
      return "Expired";
    case "pending":
      return "Pending";
    case "revoked":
      return "Revoked";
    case "left":
      return "Left";
    case "invited":
      return "Invited";
    default:
      return "Unavailable";
  }
}

function formatExpiry(value: string) {
  const days = value.replace("_days", "");
  return value.endsWith("_days") ? `Expires in ${days} days` : "Expiry unavailable";
}

function formatCapabilityCategory(item: CareCircleCapabilityCategory) {
  const category =
    item.category === "care_circle"
      ? "Family updates"
      : item.category === "coordination"
        ? "Care coordination"
        : "Access privacy";

  switch (item.access) {
    case "can_help_coordinate":
      return `${category}: Can help coordinate`;
    case "read_only":
      return `${category}: Can view updates`;
    case "limited":
      return `${category}: Limited`;
    case "private":
      return `${category}: Private`;
    case "visible":
      return `${category}: Visible`;
    default:
      return category;
  }
}

function formatCapabilityKey(value: string) {
  switch (value) {
    case "invitation.manage":
      return "Manage invites";
    case "permissions.manage":
      return "Manage access";
    case "team.manage":
      return "Manage Care Circle";
    case "team.view":
      return "View Care Circle";
    default:
      return "Workspace access";
  }
}

function toneForStatus(value: string): "muted" | "ready" | "warn" {
  if (value === "allowed" || value === "active" || value === "accepted" || value === "ready") {
    return "ready";
  }

  if (value === "pending" || value === "invited") {
    return "muted";
  }

  return "warn";
}

function getToneClass(tone: "muted" | "ready" | "warn") {
  if (tone === "ready") return "bg-sage text-sage-foreground";
  if (tone === "warn") return "bg-sand text-sand-foreground";
  return "bg-secondary text-muted-foreground";
}
