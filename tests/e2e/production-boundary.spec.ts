import { expect, test } from "@playwright/test";

test("production entry uses invite-only sign-in instead of beta simulation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Open beta workspace")).toHaveCount(0);
  await expect(page.getByText("Get started")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "https://evernestcare.com/privacy",
  );
  await expect(page.getByRole("link", { name: "Terms" })).toHaveAttribute(
    "href",
    "https://evernestcare.com/terms",
  );
  await expect(page.getByRole("link", { name: "Support" })).toHaveAttribute(
    "href",
    "https://support.evernestcare.com/help",
  );

  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Access your care workspace" })).toBeVisible();
  await expect(page.getByText("Evelyn")).toHaveCount(0);

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("production signed-out and recovery surfaces expose legal and support links", async ({
  page,
}) => {
  for (const route of ["/", "/sign-in", "/forgot-password", "/reset-password"]) {
    await page.goto(route);
    await expectPublicResourceLinks(page);
  }
});

test("production protected routes fail closed without a session", async ({ page }) => {
  for (const route of ["/today", "/calendar", "/messages", "/vault", "/care-team"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
    await expect(page.getByText("Beta workspace ready")).toHaveCount(0);
    await expect(page.getByText("Care visit")).toHaveCount(0);
  }
});

test("authentication network failures return safe recoverable states", async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on("console", (message) => consoleMessages.push(message.text()));
  await page.route("https://example.supabase.co/**", (route) => route.abort());
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("invited@example.com");
  await page.getByLabel("Password").fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Sign-in is unavailable right now. Please try again later.",
    { timeout: 12_000 },
  );
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("invited@example.com");
  await page.getByRole("button", { name: "Send reset instructions" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Password reset is unavailable right now. Please try again later.",
  );
  await expect(page.getByRole("button", { name: "Send reset instructions" })).toBeEnabled();

  const consoleOutput = consoleMessages.join("\n");
  expect(consoleOutput).not.toContain("invited@example.com");
  expect(consoleOutput).not.toContain("not-a-real-password");
  expect(consoleOutput).not.toContain("https://example.supabase.co");
});

test("session validation timeout fails closed with retry", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "sb-example-auth-token",
      JSON.stringify({
        access_token: "expired-test-access-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "expired-test-refresh-token",
        token_type: "bearer",
        user: {
          aud: "authenticated",
          email: "session-test@example.invalid",
          id: "00000000-0000-4000-8000-000000000001",
          role: "authenticated",
        },
      }),
    );
  });
  await page.route("https://example.supabase.co/auth/v1/user", async () => {
    await new Promise(() => undefined);
  });

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Session check unavailable" })).toBeVisible({
    timeout: 8_000,
  });
  await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Sign in required" })).toHaveCount(0);
});

test("authenticated production hydration is read-only and care updates are not synthetic", async ({
  page,
}) => {
  const requestedUrls: string[] = [];
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "sb-example-auth-token",
      JSON.stringify({
        access_token: "production-test-access-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "production-test-refresh-token",
        token_type: "bearer",
        user: {
          app_metadata: {},
          aud: "authenticated",
          created_at: "2026-09-15T00:00:00.000Z",
          email: "authorized@example.invalid",
          id: "00000000-0000-4000-8000-000000000001",
          role: "authenticated",
          user_metadata: {},
        },
      }),
    );
  });
  await page.route("https://example.supabase.co/**", async (route) => {
    const url = route.request().url();
    requestedUrls.push(url);

    if (url.endsWith("/auth/v1/user")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          app_metadata: {},
          aud: "authenticated",
          created_at: "2026-09-15T00:00:00.000Z",
          email: "authorized@example.invalid",
          id: "00000000-0000-4000-8000-000000000001",
          role: "authenticated",
          user_metadata: {},
        },
      });
      return;
    }

    if (url.includes("/rest/v1/rpc/hydrate_permission_context")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          active_care_recipient_id: "00000000-0000-4000-8000-000000000003",
          active_care_team_id: "00000000-0000-4000-8000-000000000002",
          advisory_capabilities: ["care_event.view", "care_note.view"],
          app_user_id: "00000000-0000-4000-8000-000000000001",
          membership_id: "00000000-0000-4000-8000-000000000004",
          membership_status: "active",
          permission_version: "production-test-version",
          role_key: "viewer",
          status: "ready",
        },
      });
      return;
    }

    if (url.includes("/rest/v1/rpc/hydrate_resource_access_context")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          active_care_recipient_id: "00000000-0000-4000-8000-000000000003",
          active_care_team_id: "00000000-0000-4000-8000-000000000002",
          app_user_id: "00000000-0000-4000-8000-000000000001",
          membership_id: "00000000-0000-4000-8000-000000000004",
          permission_version: "production-test-version",
          resource_access: [],
          role_key: "viewer",
          status: "ready",
        },
      });
      return;
    }

    if (url.includes("/rest/v1/care_events")) {
      await route.fulfill({ contentType: "application/json", json: [] });
      return;
    }

    await route.fulfill({ contentType: "application/json", json: {} });
  });

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByText("Care workspace ready")).toBeVisible();
  await expect(page.getByText("Evelyn", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: /^Care status/ }).click();
  await expect(page.getByRole("button", { name: "Add care status" })).toHaveCount(0);
  await page.getByRole("button", { name: "Close quick action" }).click();
  await page.getByRole("button", { name: /^Check-in Workspace/ }).click();
  await expect(page.getByRole("button", { name: "Add check-in status" })).toHaveCount(0);

  expect(requestedUrls.some((url) => url.includes("ensure_care_boundary"))).toBe(false);
  expect(requestedUrls.some((url) => url.includes("append_care_event"))).toBe(false);
});

async function expectPublicResourceLinks(page: import("@playwright/test").Page) {
  const expectedLinks = [
    ["Privacy Policy", "https://evernestcare.com/privacy"],
    ["Terms", "https://evernestcare.com/terms"],
    ["Support", "https://support.evernestcare.com/help"],
  ] as const;

  for (const [name, href] of expectedLinks) {
    const link = page.getByRole("link", { name });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("rel", "noreferrer");
    expect(await link.getAttribute("target")).toBeNull();
    const height = await link.evaluate((element) => element.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
  }
}
