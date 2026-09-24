import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import { usePermissions } from "@/lib/permissions/permission-context";
import { isAuthRequiredForRoutes } from "@/lib/supabase/config";
import { isProductionRuntime } from "@/lib/runtime-mode";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const { refreshSession, status } = useAuth();
  const permissions = usePermissions();
  const authRequired = isAuthRequiredForRoutes();
  const productionRuntime = isProductionRuntime();

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated || status === "loading" || permissions.status === "loading") {
    return (
      <ShellNotice
        title={productionRuntime ? "Preparing workspace" : "Preparing beta preview"}
        body={
          productionRuntime ? "Loading your authorized workspace." : "Loading workspace preview."
        }
      />
    );
  }

  if (status === "unconfigured" && authRequired) {
    return (
      <ShellNotice
        title="Connect Supabase to continue"
        body="This protected environment needs its Supabase connection settings."
      />
    );
  }

  if (status === "unavailable") {
    return (
      <ShellNotice
        title="Session check unavailable"
        body="We could not confirm your session. Your workspace remains closed until the check succeeds."
        action={
          <button
            type="button"
            onClick={() => void refreshSession()}
            className="text-[14px] font-medium text-primary"
          >
            Try again
          </button>
        }
      />
    );
  }

  if (authRequired && (status === "unauthenticated" || permissions.status === "auth-required")) {
    return (
      <ShellNotice
        title="Sign in required"
        body="Evernest Care protects care coordination spaces before showing family information."
        action={
          <Link to="/sign-in" className="text-[14px] font-medium text-primary">
            Sign in
          </Link>
        }
      />
    );
  }

  if (permissions.status === "error") {
    return (
      <ShellNotice
        title="Care workspace unavailable"
        body="We could not open your care workspace. Please try again after checking the Supabase setup."
      />
    );
  }

  return <>{children}</>;
}

function ShellNotice({
  action,
  body,
  title,
}: {
  action?: React.ReactNode;
  body: string;
  title: string;
}) {
  return (
    <main className="phone-shell flex min-h-dvh items-center justify-center px-6">
      <div className="card-soft p-6 text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage text-sage-foreground">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-[22px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </main>
  );
}
