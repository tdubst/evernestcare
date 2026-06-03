import { useMemo } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import {
  PermissionContext,
  type PermissionContextValue,
} from "@/lib/permissions/permission-context";
import { isAuthRequiredForRoutes } from "@/lib/supabase/config";

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();

  const value = useMemo<PermissionContextValue>(() => {
    if (status === "unconfigured") {
      return {
        activeCareTeamId: null,
        activeCareRecipientId: null,
        appUserId: null,
        grants: [],
        status: "unconfigured",
      };
    }

    if (!user && isAuthRequiredForRoutes()) {
      return {
        activeCareTeamId: null,
        activeCareRecipientId: null,
        appUserId: null,
        grants: [],
        status: "auth-required",
      };
    }

    return {
      activeCareTeamId: null,
      activeCareRecipientId: null,
      appUserId: null,
      grants: [],
      status: "ready",
    };
  }, [status, user]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}
