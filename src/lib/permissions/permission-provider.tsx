import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import {
  EMPTY_CARE_NOTE_ACCESS,
  PermissionContext,
  type PermissionContextValue,
} from "@/lib/permissions/permission-context";
import {
  hydrateCareBoundary,
  type HydratedCareBoundary,
} from "@/lib/permissions/care-boundary-repository";
import { isAuthRequiredForRoutes } from "@/lib/supabase/config";
import { BETA_DEMO_BOUNDARY } from "@/lib/beta-demo-workspace";

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { client, status, user } = useAuth();
  const authRequired = isAuthRequiredForRoutes();
  const [boundary, setBoundary] = useState<HydratedCareBoundary | null>(null);
  const [hydrateStatus, setHydrateStatus] = useState<"error" | "idle" | "loading" | "ready">(
    "idle",
  );

  useEffect(() => {
    let canceled = false;

    if (status !== "authenticated" || !client || !user) {
      setBoundary(null);
      setHydrateStatus("idle");
      return;
    }

    setHydrateStatus("loading");

    void hydrateCareBoundary({ client })
      .then((result) => {
        if (canceled) return;

        if (result.status === "ready") {
          setBoundary(result.boundary);
          setHydrateStatus("ready");
          return;
        }

        setBoundary(null);
        setHydrateStatus("error");
      })
      .catch(() => {
        if (canceled) return;

        setBoundary(null);
        setHydrateStatus("error");
      });

    return () => {
      canceled = true;
    };
  }, [client, status, user]);

  const value = useMemo<PermissionContextValue>(() => {
    if (!authRequired && (status === "unconfigured" || status === "unauthenticated")) {
      return {
        activeCareTeamId: BETA_DEMO_BOUNDARY.activeCareTeamId,
        activeCareRecipientId: BETA_DEMO_BOUNDARY.activeCareRecipientId,
        appUserId: BETA_DEMO_BOUNDARY.appUserId,
        careNoteAccess: BETA_DEMO_BOUNDARY.careNoteAccess,
        grants: BETA_DEMO_BOUNDARY.grants,
        isBetaPreviewWorkspace: true,
        membershipId: BETA_DEMO_BOUNDARY.membershipId,
        membershipStatus: BETA_DEMO_BOUNDARY.membershipStatus,
        permissionVersion: BETA_DEMO_BOUNDARY.permissionVersion,
        roleKey: BETA_DEMO_BOUNDARY.roleKey,
        status: "ready",
      };
    }

    if (status === "unconfigured") {
      return {
        activeCareTeamId: null,
        activeCareRecipientId: null,
        appUserId: null,
        careNoteAccess: EMPTY_CARE_NOTE_ACCESS,
        grants: [],
        isBetaPreviewWorkspace: false,
        membershipId: null,
        membershipStatus: null,
        permissionVersion: null,
        roleKey: null,
        status: "unconfigured",
      };
    }

    if (
      status === "loading" ||
      hydrateStatus === "loading" ||
      (status === "authenticated" && !boundary && hydrateStatus !== "error")
    ) {
      return {
        activeCareTeamId: null,
        activeCareRecipientId: null,
        appUserId: null,
        careNoteAccess: EMPTY_CARE_NOTE_ACCESS,
        grants: [],
        isBetaPreviewWorkspace: false,
        membershipId: null,
        membershipStatus: null,
        permissionVersion: null,
        roleKey: null,
        status: "loading",
      };
    }

    if (!user && authRequired) {
      return {
        activeCareTeamId: null,
        activeCareRecipientId: null,
        appUserId: null,
        careNoteAccess: EMPTY_CARE_NOTE_ACCESS,
        grants: [],
        isBetaPreviewWorkspace: false,
        membershipId: null,
        membershipStatus: null,
        permissionVersion: null,
        roleKey: null,
        status: "auth-required",
      };
    }

    if (hydrateStatus === "error") {
      return {
        activeCareTeamId: null,
        activeCareRecipientId: null,
        appUserId: null,
        careNoteAccess: EMPTY_CARE_NOTE_ACCESS,
        grants: [],
        isBetaPreviewWorkspace: false,
        membershipId: null,
        membershipStatus: null,
        permissionVersion: null,
        roleKey: null,
        status: "error",
      };
    }

    return {
      activeCareTeamId: boundary?.activeCareTeamId ?? null,
      activeCareRecipientId: boundary?.activeCareRecipientId ?? null,
      appUserId: boundary?.appUserId ?? null,
      careNoteAccess: boundary?.careNoteAccess ?? EMPTY_CARE_NOTE_ACCESS,
      grants: boundary?.grants ?? [],
      isBetaPreviewWorkspace: false,
      membershipId: boundary?.membershipId ?? null,
      membershipStatus: boundary?.membershipStatus ?? null,
      permissionVersion: boundary?.permissionVersion ?? null,
      roleKey: boundary?.roleKey ?? null,
      status: "ready",
    };
  }, [authRequired, boundary, hydrateStatus, status, user]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}
