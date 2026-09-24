import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { CalendarDays, FolderLock, Home, LogOut, MessageCircle, Users } from "lucide-react";
import { useState } from "react";

import { ProtectedShell } from "@/components/app/protected-shell";
import { useAuth } from "@/lib/auth/auth-context";
import { isProductionRuntime } from "@/lib/runtime-mode";

export const Route = createFileRoute("/_tabs")({
  component: TabsLayout,
});

const TABS = [
  { to: "/today", label: "Today", icon: Home },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/vault", label: "Vault", icon: FolderLock },
  { to: "/care-team", label: "Circle", icon: Users },
] as const;

function TabsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const productionRuntime = isProductionRuntime();
  const tabs = productionRuntime
    ? TABS.filter(({ to }) => to !== "/calendar" && to !== "/messages")
    : TABS;

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    await navigate({ to: "/", replace: true });
  };

  return (
    <ProtectedShell>
      <div className="phone-shell pb-[calc(9rem+env(safe-area-inset-bottom))]">
        <Outlet />
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 pointer-events-none">
          <div className="pointer-events-auto mx-auto flex items-center justify-between rounded-full bg-card/85 backdrop-blur-xl border hairline shadow-card px-2 py-1.5">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-full transition ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.8} />
                  <span className="text-[10px] font-medium tracking-wide">{label}</span>
                </Link>
              );
            })}
            {productionRuntime && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="flex-1 flex flex-col items-center gap-0.5 rounded-full py-1.5 text-muted-foreground transition disabled:cursor-wait disabled:opacity-50"
                aria-label="Sign out"
              >
                <LogOut className="h-[22px] w-[22px]" strokeWidth={1.8} />
                <span className="text-[10px] font-medium tracking-wide">
                  {signingOut ? "Signing out" : "Sign out"}
                </span>
              </button>
            )}
          </div>
        </nav>
      </div>
    </ProtectedShell>
  );
}
