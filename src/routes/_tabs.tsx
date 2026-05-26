import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { CalendarDays, Home, MessageCircle, FolderLock, Users } from "lucide-react";

import { ProtectedShell } from "@/components/app/protected-shell";

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
  return (
    <ProtectedShell>
      <div className="phone-shell pb-24">
        <Outlet />
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-4 pb-5 pt-2 pointer-events-none">
          <div className="pointer-events-auto mx-auto flex items-center justify-between rounded-full bg-card/85 backdrop-blur-xl border hairline shadow-card px-2 py-1.5">
            {TABS.map(({ to, label, icon: Icon }) => {
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
          </div>
        </nav>
      </div>
    </ProtectedShell>
  );
}
