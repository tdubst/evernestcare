import type { SupabaseClient } from "@supabase/supabase-js";

export type CareCircleRpcStatus =
  | "accepted"
  | "access_changed"
  | "already_used"
  | "auth_required"
  | "boundary_unavailable"
  | "created"
  | "denied"
  | "duplicate_request"
  | "expired"
  | "invalid_request"
  | "pending"
  | "ready"
  | "revoked"
  | "stale_permission_context"
  | "unavailable"
  | "wrong_audience";

export type CareCircleCapabilityCategory = {
  access: string;
  category: string;
};

export type CareCircleMemberSummary = {
  capabilityCategories: CareCircleCapabilityCategory[];
  membershipStatus: string;
  roleCategory: string;
  subjectAlias: string;
};

export type CareCircleInvitationSummary = {
  audienceCategory: string;
  capabilityCategories: CareCircleCapabilityCategory[];
  expiresIn: string;
  expiryStatus: string;
  invitePreviewId: string | null;
  inviteStatus: string;
  roleCategory: string;
};

export type CareCirclePermissionSummary = {
  accessState: string;
  capabilityCategory: string;
  capabilityKey: string;
  result: string;
  roleCategory: string;
  sourceScope: string;
};

export type CareCircleSummaryResult =
  | {
      advisoryPermissions: CareCirclePermissionSummary[];
      careCircle: CareCircleMemberSummary[];
      pendingInvitations: CareCircleInvitationSummary[];
      permissionVersion: string | null;
      status: "ready";
    }
  | { status: Exclude<CareCircleRpcStatus, "ready"> };

export type CareCirclePreviewResult =
  | {
      audienceCategory: string;
      capabilityCategories: CareCircleCapabilityCategory[];
      expiresIn: string;
      expiryStatus: string;
      permissionVersion: string | null;
      roleCategory: string;
      status: "ready";
    }
  | { status: Exclude<CareCircleRpcStatus, "ready"> };

export type CareCircleCreateResult =
  | {
      audienceCategory: string;
      capabilityCategories: CareCircleCapabilityCategory[];
      expiresIn: string;
      expiryStatus: string;
      invitePreviewId: string | null;
      inviteStatus: string;
      permissionVersion: string | null;
      roleCategory: string;
      status: "created" | "duplicate_request";
    }
  | { status: Exclude<CareCircleRpcStatus, "created" | "duplicate_request"> };

export type CareCircleResolveResult =
  | {
      audienceCategory: string;
      capabilityCategories: CareCircleCapabilityCategory[];
      inviteStatus: string;
      roleCategory: string;
      status: "accepted" | "denied";
    }
  | { status: Exclude<CareCircleRpcStatus, "accepted" | "denied"> };

export type CareCircleInvitationUpdateResult =
  | { inviteStatus: string; status: "expired" | "ready" | "revoked" }
  | { status: Exclude<CareCircleRpcStatus, "expired" | "ready" | "revoked"> };

type CareCircleSummaryRow = {
  advisory_permissions: unknown;
  care_circle: unknown;
  pending_invitations: unknown;
  permission_version: string | null;
  status: string;
};

type PermissionsAdvisoryRow = {
  advisory_permissions: unknown;
  permission_version: string | null;
  status: string;
};

type InvitationListRow = {
  invitations: unknown;
  status: string;
};

type InvitationPreviewRow = {
  audience_category: string | null;
  capability_categories: unknown;
  expires_in: string | null;
  expiry_status: string | null;
  permission_version: string | null;
  role_category: string | null;
  status: string;
};

type InvitationCreateRow = InvitationPreviewRow & {
  invite_preview_id: string | null;
  invite_status: string | null;
};

type InvitationResolveRow = {
  audience_category: string | null;
  capability_categories: unknown;
  invite_status: string | null;
  role_category: string | null;
  status: string;
};

type InvitationUpdateRow = {
  invite_status: string | null;
  status: string;
};

type ExpireInvitationsRow = {
  result: string | null;
  status: string;
};

export async function getCareCircleSummary({
  client,
}: {
  client: SupabaseClient | null;
}): Promise<CareCircleSummaryResult> {
  if (!client) return { status: "unavailable" };

  const { data, error } = await client
    .rpc("get_care_circle_summary", { p_request: {} })
    .maybeSingle<CareCircleSummaryRow>();

  if (error || !data) return { status: "unavailable" };
  if (data.status !== "ready") return { status: toCareCircleStatus(data.status) };

  return {
    advisoryPermissions: parsePermissionSummaries(data.advisory_permissions),
    careCircle: parseMemberSummaries(data.care_circle),
    pendingInvitations: parseInvitationSummaries(data.pending_invitations),
    permissionVersion: data.permission_version,
    status: "ready",
  };
}

export async function getPermissionsAdvisorySummary({
  client,
}: {
  client: SupabaseClient | null;
}): Promise<
  | {
      advisoryPermissions: CareCirclePermissionSummary[];
      permissionVersion: string | null;
      status: "ready";
    }
  | { status: Exclude<CareCircleRpcStatus, "ready"> }
> {
  if (!client) return { status: "unavailable" };

  const { data, error } = await client
    .rpc("get_permissions_advisory_summary", { p_request: {} })
    .maybeSingle<PermissionsAdvisoryRow>();

  if (error || !data) return { status: "unavailable" };
  if (data.status !== "ready") return { status: toCareCircleStatus(data.status) };

  return {
    advisoryPermissions: parsePermissionSummaries(data.advisory_permissions),
    permissionVersion: data.permission_version,
    status: "ready",
  };
}

export async function listCareCircleInvitations({
  client,
}: {
  client: SupabaseClient | null;
}): Promise<
  | { invitations: CareCircleInvitationSummary[]; status: "ready" }
  | { status: Exclude<CareCircleRpcStatus, "ready"> }
> {
  if (!client) return { status: "unavailable" };

  const { data, error } = await client
    .rpc("list_care_circle_invitations", { p_request: {} })
    .maybeSingle<InvitationListRow>();

  if (error || !data) return { status: "unavailable" };
  if (data.status !== "ready") return { status: toCareCircleStatus(data.status) };

  return {
    invitations: parseInvitationSummaries(data.invitations),
    status: "ready",
  };
}

export async function previewCareCircleInvitation({
  client,
  expiresInDays,
  permissionVersion,
  roleKey,
}: {
  client: SupabaseClient | null;
  expiresInDays: number;
  permissionVersion: string | null;
  roleKey: "family_member" | "viewer";
}): Promise<CareCirclePreviewResult> {
  if (!client) return { status: "unavailable" };

  const { data, error } = await client
    .rpc("preview_care_circle_invitation", {
      p_request: {
        expires_in_days: expiresInDays,
        permission_version: permissionVersion,
        role_key: roleKey,
      },
    })
    .maybeSingle<InvitationPreviewRow>();

  if (error || !data) return { status: "unavailable" };
  if (data.status !== "ready" || !data.role_category || !data.audience_category) {
    return { status: toCareCircleStatus(data.status) };
  }

  return {
    audienceCategory: data.audience_category,
    capabilityCategories: parseCapabilityCategories(data.capability_categories),
    expiresIn: data.expires_in ?? "unavailable",
    expiryStatus: data.expiry_status ?? "unavailable",
    permissionVersion: data.permission_version,
    roleCategory: data.role_category,
    status: "ready",
  };
}

export async function createCareCircleInvitation({
  client,
  expiresInDays,
  invitedEmail,
  permissionVersion,
  roleKey,
}: {
  client: SupabaseClient | null;
  expiresInDays: number;
  invitedEmail: string;
  permissionVersion: string | null;
  roleKey: "family_member" | "viewer";
}): Promise<CareCircleCreateResult> {
  if (!client) return { status: "unavailable" };

  const { data, error } = await client
    .rpc("create_care_circle_invitation", {
      p_request: {
        expires_in_days: expiresInDays,
        invited_email: invitedEmail,
        permission_version: permissionVersion,
        role_key: roleKey,
      },
    })
    .maybeSingle<InvitationCreateRow>();

  if (error || !data) return { status: "unavailable" };
  if (
    (data.status !== "created" && data.status !== "duplicate_request") ||
    !data.role_category ||
    !data.audience_category
  ) {
    return { status: toCareCircleStatus(data.status) };
  }

  return {
    audienceCategory: data.audience_category,
    capabilityCategories: parseCapabilityCategories(data.capability_categories),
    expiresIn: data.expires_in ?? "unavailable",
    expiryStatus: data.expiry_status ?? "unavailable",
    invitePreviewId: data.invite_preview_id,
    inviteStatus: data.invite_status ?? data.status,
    permissionVersion: data.permission_version,
    roleCategory: data.role_category,
    status: data.status,
  };
}

export async function acceptCareCircleInvitation({
  client,
  invitePreviewId,
}: {
  client: SupabaseClient | null;
  invitePreviewId: string | null;
}): Promise<CareCircleResolveResult> {
  return resolveCareCircleInvitation({
    client,
    functionName: "accept_care_circle_invitation",
    invitePreviewId,
  });
}

export async function denyCareCircleInvitation({
  client,
  invitePreviewId,
}: {
  client: SupabaseClient | null;
  invitePreviewId: string | null;
}): Promise<CareCircleResolveResult> {
  return resolveCareCircleInvitation({
    client,
    functionName: "deny_care_circle_invitation",
    invitePreviewId,
  });
}

export async function revokeCareCircleInvitation({
  client,
  invitePreviewId,
  permissionVersion,
}: {
  client: SupabaseClient | null;
  invitePreviewId: string | null;
  permissionVersion: string | null;
}): Promise<CareCircleInvitationUpdateResult> {
  return updateCareCircleInvitation({
    client,
    functionName: "revoke_care_circle_invitation",
    invitePreviewId,
    permissionVersion,
  });
}

export async function expireCareCircleInvitation({
  client,
  invitePreviewId,
  permissionVersion,
}: {
  client: SupabaseClient | null;
  invitePreviewId: string | null;
  permissionVersion: string | null;
}): Promise<CareCircleInvitationUpdateResult> {
  return updateCareCircleInvitation({
    client,
    functionName: "expire_care_circle_invitation",
    invitePreviewId,
    permissionVersion,
  });
}

export async function expireCareCircleInvitations({
  client,
  permissionVersion,
}: {
  client: SupabaseClient | null;
  permissionVersion: string | null;
}): Promise<{ result: string | null; status: CareCircleRpcStatus }> {
  if (!client) return { result: null, status: "unavailable" };

  const { data, error } = await client
    .rpc("expire_care_circle_invitations", {
      p_request: { permission_version: permissionVersion },
    })
    .maybeSingle<ExpireInvitationsRow>();

  if (error || !data) return { result: null, status: "unavailable" };

  return {
    result: data.result,
    status: toCareCircleStatus(data.status),
  };
}

async function resolveCareCircleInvitation({
  client,
  functionName,
  invitePreviewId,
}: {
  client: SupabaseClient | null;
  functionName: "accept_care_circle_invitation" | "deny_care_circle_invitation";
  invitePreviewId: string | null;
}): Promise<CareCircleResolveResult> {
  if (!client || !invitePreviewId) return { status: "unavailable" };

  const { data, error } = await client
    .rpc(functionName, { p_request: { invite_preview_id: invitePreviewId } })
    .maybeSingle<InvitationResolveRow>();

  if (error || !data) return { status: "unavailable" };
  if (
    (data.status !== "accepted" && data.status !== "denied") ||
    !data.role_category ||
    !data.audience_category
  ) {
    return { status: toCareCircleStatus(data.status) };
  }

  return {
    audienceCategory: data.audience_category,
    capabilityCategories: parseCapabilityCategories(data.capability_categories),
    inviteStatus: data.invite_status ?? data.status,
    roleCategory: data.role_category,
    status: data.status,
  };
}

async function updateCareCircleInvitation({
  client,
  functionName,
  invitePreviewId,
  permissionVersion,
}: {
  client: SupabaseClient | null;
  functionName: "expire_care_circle_invitation" | "revoke_care_circle_invitation";
  invitePreviewId: string | null;
  permissionVersion: string | null;
}): Promise<CareCircleInvitationUpdateResult> {
  if (!client || !invitePreviewId) return { status: "unavailable" };

  const { data, error } = await client
    .rpc(functionName, {
      p_request: {
        invite_preview_id: invitePreviewId,
        permission_version: permissionVersion,
      },
    })
    .maybeSingle<InvitationUpdateRow>();

  if (error || !data) return { status: "unavailable" };
  if (data.status !== "ready" && data.status !== "revoked" && data.status !== "expired") {
    return { status: toCareCircleStatus(data.status) };
  }

  return {
    inviteStatus: data.invite_status ?? data.status,
    status: data.status,
  };
}

function parseMemberSummaries(value: unknown): CareCircleMemberSummary[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const subjectAlias = safeString(item.subject_alias);
      const membershipStatus = safeString(item.membership_status);
      const roleCategory = safeString(item.role_category);

      if (!subjectAlias || !membershipStatus || !roleCategory) return null;

      return {
        capabilityCategories: parseCapabilityCategories(item.capability_categories),
        membershipStatus,
        roleCategory,
        subjectAlias,
      };
    })
    .filter((item): item is CareCircleMemberSummary => Boolean(item));
}

function parseInvitationSummaries(value: unknown): CareCircleInvitationSummary[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const inviteStatus = safeString(item.invite_status);
      const roleCategory = safeString(item.role_category);
      const audienceCategory = safeString(item.audience_category);

      if (!inviteStatus || !roleCategory || !audienceCategory) return null;

      return {
        audienceCategory,
        capabilityCategories: parseCapabilityCategories(item.capability_categories),
        expiresIn: safeString(item.expires_in) ?? "unavailable",
        expiryStatus: safeString(item.expiry_status) ?? "unavailable",
        invitePreviewId: safeString(item.invite_preview_id),
        inviteStatus,
        roleCategory,
      };
    })
    .filter((item): item is CareCircleInvitationSummary => Boolean(item));
}

function parsePermissionSummaries(value: unknown): CareCirclePermissionSummary[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const capabilityKey = safeString(item.capability_key);
      const accessState = safeString(item.access_state);

      if (!capabilityKey || !accessState) return null;

      return {
        accessState,
        capabilityCategory:
          safeString(item.capability_category) ?? categoryForCapability(capabilityKey),
        capabilityKey,
        result: safeString(item.result) ?? accessState,
        roleCategory: safeString(item.role_category) ?? "workspace",
        sourceScope: safeString(item.source_scope) ?? "server_projection",
      };
    })
    .filter((item): item is CareCirclePermissionSummary => Boolean(item));
}

function parseCapabilityCategories(value: unknown): CareCircleCapabilityCategory[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const category = safeString(item.category);
      const access = safeString(item.access);

      if (!category || !access) return null;
      return { access, category };
    })
    .filter((item): item is CareCircleCapabilityCategory => Boolean(item));
}

function categoryForCapability(capabilityKey: string) {
  if (capabilityKey.includes("invitation")) return "invitations";
  if (capabilityKey.includes("permission")) return "permissions";
  if (capabilityKey.includes("team")) return "care_circle";
  return "workspace";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toCareCircleStatus(status: string | null | undefined): CareCircleRpcStatus {
  switch (status) {
    case "accepted":
    case "access_changed":
    case "already_used":
    case "auth_required":
    case "boundary_unavailable":
    case "created":
    case "denied":
    case "duplicate_request":
    case "expired":
    case "invalid_request":
    case "pending":
    case "ready":
    case "revoked":
    case "stale_permission_context":
    case "unavailable":
    case "wrong_audience":
      return status;
    default:
      return "unavailable";
  }
}
