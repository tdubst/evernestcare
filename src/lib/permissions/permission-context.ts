import { createContext, useContext } from "react";

export type PermissionRuntimeStatus =
  "auth-required" | "error" | "loading" | "ready" | "unconfigured";

export type CareNoteAccess = {
  canAppend: boolean;
  canView: boolean;
  status: "ready" | "unavailable";
};

export const EMPTY_CARE_NOTE_ACCESS: CareNoteAccess = {
  canAppend: false,
  canView: false,
  status: "unavailable",
};

export type PermissionContextValue = {
  activeCareTeamId: string | null;
  activeCareRecipientId: string | null;
  appUserId: string | null;
  careNoteAccess: CareNoteAccess;
  grants: string[];
  isBetaPreviewWorkspace: boolean;
  membershipId: string | null;
  membershipStatus: string | null;
  permissionVersion: string | null;
  roleKey: string | null;
  status: PermissionRuntimeStatus;
};

export const PermissionContext = createContext<PermissionContextValue | null>(null);

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionProvider");
  }

  return context;
}
