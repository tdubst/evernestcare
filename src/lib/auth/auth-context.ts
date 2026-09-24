import { createContext, useContext } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

export type AuthStatus =
  "authenticated" | "loading" | "unauthenticated" | "unavailable" | "unconfigured";

export type SignInResult = { status: "ready" } | { status: "invalid" | "unavailable" };
export type PasswordUpdateResult = { status: "ready" } | { status: "invalid" | "unavailable" };
export type PasswordResetRequestResult = { status: "ready" } | { status: "unavailable" };

export type AuthContextValue = {
  client: SupabaseClient | null;
  requestPasswordReset: (email: string) => Promise<PasswordResetRequestResult>;
  refreshSession: () => Promise<void>;
  session: Session | null;
  signInWithPassword: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  status: AuthStatus;
  updatePassword: (password: string) => Promise<PasswordUpdateResult>;
  user: User | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
