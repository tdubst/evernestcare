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

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { client, status, user } = useAuth();
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
    if (status === "unconfigured") {
      return {
        activeCareTeamId: null,
        activeCareRecipientId: null,
        appUserId: null,
        careNoteAccess: EMPTY_CARE_NOTE_ACCESS,
        grants: [],
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
        membershipId: null,
        membershipStatus: null,
        permissionVersion: null,
        roleKey: null,
        status: "loading",
      };
    }

    if (!user && isAuthRequiredForRoutes()) {
      return {
        activeCareTeamId: null,
        activeCareRecipientId: null,
        appUserId: null,
        careNoteAccess: EMPTY_CARE_NOTE_ACCESS,
        grants: [],
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
      membershipId: boundary?.membershipId ?? null,
      membershipStatus: boundary?.membershipStatus ?? null,
      permissionVersion: boundary?.permissionVersion ?? null,
      roleKey: boundary?.roleKey ?? null,
      status: "ready",
    };
  }, [boundary, hydrateStatus, status, user]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}
