import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { PermissionProvider } from "@/lib/permissions/permission-provider";
import { reportSafeError } from "@/lib/safe-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-semibold text-foreground tracking-tight">404</h1>
        <p className="mt-3 text-muted-foreground">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Back to Evernest Care
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  reportSafeError("client_render_failed", error);
  const router = useRouter();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went off course</h1>
        <p className="mt-2 text-sm text-muted-foreground">Take a breath. Try again.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Evernest Care — Family care, coordinated" },
      {
        name: "description",
        content: "A calm shared workspace for families coordinating care for the people they love.",
      },
      { name: "theme-color", content: "#f7f6f1" },
      { property: "og:title", content: "Evernest Care — Family care, coordinated" },
      {
        property: "og:description",
        content: "A calm shared workspace for families coordinating care for the people they love.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Evernest Care — Family care, coordinated" },
      {
        name: "twitter:description",
        content: "A calm shared workspace for families coordinating care for the people they love.",
      },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23f7f6f1'/%3E%3Cpath d='M32 12c8 7 16 8 16 8v13c0 10-7 16-16 19-9-3-16-9-16-19V20s8-1 16-8Z' fill='%236ea7c8'/%3E%3Cpath d='M25 33h14M32 26v14' stroke='white' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionProvider>
          <Outlet />
        </PermissionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
