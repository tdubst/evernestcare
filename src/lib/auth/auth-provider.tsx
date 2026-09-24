import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type SignInResult,
} from "@/lib/auth/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { reportSafeError } from "@/lib/safe-error-reporting";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(client ? "loading" : "unconfigured");

  const refreshSession = useCallback(async () => {
    if (!client) {
      setStatus("unconfigured");
      setSession(null);
      return;
    }

    setStatus("loading");
    try {
      const response = await withAuthTimeout(client.auth.getSession(), 5_000);
      if (!response) {
        setStatus("unavailable");
        return;
      }

      const { data, error } = response;
      if (error) {
        setSession(null);
        setStatus("unauthenticated");
        return;
      }

      if (!data.session) {
        setSession(null);
        setStatus("unauthenticated");
        return;
      }

      const userResponse = await withAuthTimeout(client.auth.getUser(), 5_000);
      if (!userResponse) {
        setStatus("unavailable");
        return;
      }
      if (userResponse.error || !userResponse.data.user) {
        setSession(null);
        setStatus("unauthenticated");
        return;
      }

      setSession(data.session);
      setStatus("authenticated");
    } catch (error) {
      reportSafeError("auth_session_refresh_failed", error);
      setStatus("unavailable");
    }
  }, [client]);

  const signOut = async () => {
    if (!client) return;
    try {
      await withAuthTimeout(client.auth.signOut());
    } catch (error) {
      reportSafeError("auth_sign_out_failed", error);
    }
    setSession(null);
    setStatus("unauthenticated");
  };

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!client) return { status: "unavailable" as const };

      try {
        const response = await withAuthTimeout(
          client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          }),
        );
        if (!response || response.error) return { status: "unavailable" as const };
      } catch (error) {
        reportSafeError("auth_password_reset_failed", error);
        return { status: "unavailable" as const };
      }

      // Keep the response generic so account existence is never disclosed.
      return { status: "ready" as const };
    },
    [client],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      if (!client) return { status: "unavailable" };

      try {
        const response = await withAuthTimeout(client.auth.signInWithPassword({ email, password }));
        if (!response) return { status: "unavailable" };

        const { data, error } = response;
        if (error || !data.session) {
          setSession(null);
          setStatus("unauthenticated");
          const invalidCredentials = Boolean(
            error?.status && error.status >= 400 && error.status < 500,
          );
          return { status: invalidCredentials ? "invalid" : "unavailable" };
        }

        setSession(data.session);
        setStatus("authenticated");
        return { status: "ready" };
      } catch (error) {
        reportSafeError("auth_sign_in_failed", error);
        setSession(null);
        setStatus("unauthenticated");
        return { status: "unavailable" };
      }
    },
    [client],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      if (!client || !session) return { status: "unavailable" as const };

      try {
        const response = await withAuthTimeout(client.auth.updateUser({ password }));
        if (!response) return { status: "unavailable" as const };

        const { error } = response;
        return { status: error ? ("invalid" as const) : ("ready" as const) };
      } catch (error) {
        reportSafeError("auth_password_update_failed", error);
        return { status: "unavailable" as const };
      }
    },
    [client, session],
  );

  useEffect(() => {
    void refreshSession();

    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") return;
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, [client, refreshSession]);

  const value: AuthContextValue = {
    client,
    requestPasswordReset,
    refreshSession,
    session,
    signInWithPassword,
    signOut,
    status,
    updatePassword,
    user: session?.user ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function withAuthTimeout<T>(operation: Promise<T>, timeoutMs = 8_000): Promise<T | null> {
  let timeoutId: number | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}
