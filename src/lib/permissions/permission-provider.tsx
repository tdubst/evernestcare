import { useMemo } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import {
  PermissionContext,
  type PermissionContextValue,
} from "@/lib/permissions/permission-context";

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();

  const value = useMemo<PermissionContextValue>(() => {
    if (status === "unconfigured") {
      return {
        activeCareRecipientId: null,
        grants: [],
        status: "unconfigured",
      };
    }

    if (!user) {
      return {
        activeCareRecipientId: null,
        grants: [],
        status: "auth-required",
      };
    }

    return {
      activeCareRecipientId: null,
      grants: [],
      status: "ready",
    };
  }, [status, user]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}
