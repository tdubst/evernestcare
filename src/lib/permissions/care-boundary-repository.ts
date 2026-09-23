import type { SupabaseClient } from "@supabase/supabase-js";

import { EMPTY_CARE_NOTE_ACCESS, type CareNoteAccess } from "@/lib/permissions/permission-context";

export type HydratedCareBoundary = {
  activeCareRecipientId: string;
  activeCareTeamId: string;
  appUserId: string;
  careNoteAccess: CareNoteAccess;
  grants: string[];
  membershipId: string;
  membershipStatus: string;
  permissionVersion: string;
  roleKey: string;
};

export type HydrateCareBoundaryResult =
  | { boundary: HydratedCareBoundary; status: "ready" }
  | { reason: "hydrate-failed"; status: "error" };

type EnsureCareBoundaryRow = {
  active_care_recipient_id: string | null;
  active_care_team_id: string | null;
  app_user_id: string | null;
  membership_id: string | null;
  membership_status: string | null;
  permission_version: string | null;
  role_key: string | null;
  status: string;
};

type HydratePermissionContextRow = {
  active_care_recipient_id: string | null;
  active_care_team_id: string | null;
  advisory_capabilities: string[] | null;
  app_user_id: string | null;
  membership_id: string | null;
  membership_status: string | null;
  permission_version: string | null;
  role_key: string | null;
  status: string;
};

type HydrateResourceAccessContextRow = {
  active_care_recipient_id: string | null;
  active_care_team_id: string | null;
  app_user_id: string | null;
  membership_id: string | null;
  permission_version: string | null;
  resource_access: unknown;
  role_key: string | null;
  status: string;
};

async function hydratePermissionContext({
  client,
}: {
  client: SupabaseClient;
}): Promise<HydratePermissionContextRow | null> {
  const { data, error } = await client
    .rpc("hydrate_permission_context")
    .maybeSingle<HydratePermissionContextRow>();

  if (
    error ||
    data?.status !== "ready" ||
    !data.app_user_id ||
    !data.active_care_team_id ||
    !data.active_care_recipient_id ||
    !data.membership_id ||
    !data.membership_status ||
    !data.permission_version ||
    !data.role_key ||
    !Array.isArray(data.advisory_capabilities)
  ) {
    return null;
  }

  return data;
}

async function hydrateCareNoteAccess({
  client,
  permissionContext,
}: {
  client: SupabaseClient;
  permissionContext: HydratePermissionContextRow;
}): Promise<CareNoteAccess> {
  const { data, error } = await client
    .rpc("hydrate_resource_access_context", {
      p_request: {
        page_size: 10,
        resource_classes: ["care_recipient"],
        resources: [
          {
            capabilities: ["care_note.append", "care_note.view"],
            resource_id: null,
            resource_type: "care_recipient",
          },
        ],
      },
    })
    .maybeSingle<HydrateResourceAccessContextRow>();

  if (
    error ||
    data?.status !== "ready" ||
    data.app_user_id !== permissionContext.app_user_id ||
    data.active_care_team_id !== permissionContext.active_care_team_id ||
    data.active_care_recipient_id !== permissionContext.active_care_recipient_id ||
    data.membership_id !== permissionContext.membership_id ||
    data.permission_version !== permissionContext.permission_version
  ) {
    return EMPTY_CARE_NOTE_ACCESS;
  }

  return parseCareNoteAccess(data.resource_access);
}

function parseCareNoteAccess(resourceAccess: unknown): CareNoteAccess {
  if (!Array.isArray(resourceAccess)) {
    return EMPTY_CARE_NOTE_ACCESS;
  }

  const allowedCapabilities = new Set<string>();

  for (const item of resourceAccess) {
    if (!isResourceAccessRow(item)) continue;
    if (item.resource_type !== "care_recipient" || item.access !== "allowed") continue;
    if (item.capability === "care_note.append" || item.capability === "care_note.view") {
      allowedCapabilities.add(item.capability);
    }
  }

  return {
    canAppend: allowedCapabilities.has("care_note.append"),
    canView: allowedCapabilities.has("care_note.view"),
    status: "ready",
  };
}

function isResourceAccessRow(value: unknown): value is {
  access: string;
  capability: string;
  resource_type: string;
} {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    "access" in value &&
    "capability" in value &&
    "resource_type" in value &&
    typeof value.access === "string" &&
    typeof value.capability === "string" &&
    typeof value.resource_type === "string"
  );
}

export async function hydrateCareBoundary({
  client,
}: {
  client: SupabaseClient;
}): Promise<HydrateCareBoundaryResult> {
  const { data, error } = await client
    .rpc("ensure_care_boundary", {
      p_recipient_display_name: "Family member",
      p_relationship_context: "Care coordination",
    })
    .maybeSingle<EnsureCareBoundaryRow>();

  if (
    error ||
    data?.status !== "ready" ||
    !data.app_user_id ||
    !data.active_care_team_id ||
    !data.active_care_recipient_id ||
    !data.membership_id ||
    !data.membership_status ||
    !data.permission_version ||
    !data.role_key
  ) {
    return { reason: "hydrate-failed", status: "error" };
  }

  const permissionContext = await hydratePermissionContext({ client });

  if (
    !permissionContext ||
    permissionContext.app_user_id !== data.app_user_id ||
    permissionContext.active_care_team_id !== data.active_care_team_id ||
    permissionContext.active_care_recipient_id !== data.active_care_recipient_id ||
    permissionContext.membership_id !== data.membership_id ||
    !permissionContext.membership_status ||
    !permissionContext.permission_version ||
    !permissionContext.role_key ||
    !Array.isArray(permissionContext.advisory_capabilities)
  ) {
    return { reason: "hydrate-failed", status: "error" };
  }

  const careNoteAccess = await hydrateCareNoteAccess({ client, permissionContext });

  return {
    boundary: {
      activeCareRecipientId: permissionContext.active_care_recipient_id,
      activeCareTeamId: permissionContext.active_care_team_id,
      appUserId: permissionContext.app_user_id,
      careNoteAccess,
      grants: permissionContext.advisory_capabilities,
      membershipId: permissionContext.membership_id,
      membershipStatus: permissionContext.membership_status,
      permissionVersion: permissionContext.permission_version,
      roleKey: permissionContext.role_key,
    },
    status: "ready",
  };
}
