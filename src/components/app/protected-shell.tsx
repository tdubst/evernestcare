import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { usePermissions } from "@/lib/permissions/permission-context";
import { isAuthRequiredForRoutes } from "@/lib/supabase/config";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const permissions = usePermissions();
  const authRequired = isAuthRequiredForRoutes();

  if (status === "loading") {
    return <ShellNotice title="Opening EvernestCare" body="Checking your care workspace." />;
  }

  if (status === "unconfigured" && authRequired) {
    return (
      <ShellNotice
        title="Connect Supabase to continue"
        body="Protected alpha routes are ready, but this environment needs Supabase URL and anon key settings."
      />
    );
  }

  if (authRequired && (status === "unauthenticated" || permissions.status === "auth-required")) {
    return (
      <ShellNotice
        title="Sign in required"
        body="EvernestCare protects care coordination spaces before showing family information."
        action={
          <Link to="/onboarding" className="text-[14px] font-medium text-primary">
            Start onboarding
          </Link>
        }
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
