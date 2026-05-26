import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { AuthContext, type AuthContextValue, type AuthStatus } from "@/lib/auth/auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.error(error);
      setSession(null);
      setStatus("unauthenticated");
      return;
    }

    setSession(data.session);
    setStatus(data.session ? "authenticated" : "unauthenticated");
  }, [client]);

  const signOut = async () => {
    if (!client) return;
    await client.auth.signOut();
    setSession(null);
    setStatus("unauthenticated");
  };

  useEffect(() => {
    void refreshSession();

    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, [client, refreshSession]);

  const value: AuthContextValue = {
    client,
    refreshSession,
    session,
    signOut,
    status,
    user: session?.user ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
