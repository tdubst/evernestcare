import { createContext, useContext } from "react";

export type PermissionRuntimeStatus = "auth-required" | "ready" | "unconfigured";

export type PermissionContextValue = {
  activeCareRecipientId: string | null;
  grants: string[];
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
