import { expect, test, type Page } from "@playwright/test";

type CapturedConsoleMessage = { text: string; type: string };

const SENSITIVE_CONSOLE_PATTERNS = [
  {
    id: "auth-language",
    pattern: /\b(?:access_token|refresh_token|id_token|authorization|bearer|jwt|cookie)\b/i,
  },
  {
    id: "storage-or-api-key",
    pattern: /\b(?:localstorage|sessionstorage|service_role|api[_ -]?key|apikey)\b/i,
  },
  {
    id: "secret-language",
    pattern: /\b(?:password|secret|private[_ -]?key|publishable[_ -]?key)\b/i,
  },
  {
    id: "care-identifier",
    pattern: /\b(?:care_team|care_recipient|client_event_id|care_event_id)\b/i,
  },
  { id: "supabase-storage-key", pattern: /\bsb-[a-z0-9-]+\b/i },
  {
    id: "jwt-shaped",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    id: "uuid-shaped",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  },
] as const;

test.describe.configure({ mode: "serial" });

test("authorized synthetic owner can use and leave the production workspace", async ({ page }) => {
  const ownerEmail = requireEnvironment("STAGING_OWNER_EMAIL");
  const ownerPassword = requireEnvironment("STAGING_OWNER_PASSWORD");
  const stagingUrl = requireEnvironment("STAGING_SUPABASE_URL");
  const consoleMessages = captureConsole(page);

  await signIn(page, ownerEmail, ownerPassword);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  await expect(page.getByText("Care workspace ready").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Circle", exact: true }).click();
  await expect(page).toHaveURL(/\/care-team$/);
  await expect(page.getByRole("heading", { level: 1, name: "Care Circle" })).toBeVisible();
  await expect(page.getByText("Care Circle ready").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Vault", exact: true }).click();
  await expect(page).toHaveURL(/\/vault$/);
  await expect(page.getByRole("heading", { level: 1, name: "Vault" })).toBeVisible();
  await expect(page.getByText("Vault workspace ready").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
  assertContentFreeConsole(consoleMessages, [ownerEmail, ownerPassword, stagingUrl]);
});

test("revoked synthetic user remains outside the production workspace", async ({ page }) => {
  const revokedEmail = requireEnvironment("STAGING_REVOKED_EMAIL");
  const revokedPassword = requireEnvironment("STAGING_REVOKED_PASSWORD");
  const stagingUrl = requireEnvironment("STAGING_SUPABASE_URL");
  const consoleMessages = captureConsole(page);

  await signIn(page, revokedEmail, revokedPassword);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: "Care workspace unavailable" })).toBeVisible();
  await expect(page.getByText("Care workspace ready")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto("/vault");
  await expect(page.getByRole("heading", { name: "Care workspace unavailable" })).toBeVisible();
  await expect(page.getByText("Vault workspace ready")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  assertContentFreeConsole(consoleMessages, [revokedEmail, revokedPassword, stagingUrl]);
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in to your care workspace" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
}

function captureConsole(page: Page) {
  const messages: CapturedConsoleMessage[] = [];
  page.on("console", (message) => messages.push({ text: message.text(), type: message.type() }));
  page.on("pageerror", (error) => messages.push({ text: error.message, type: "pageerror" }));
  return messages;
}

function assertContentFreeConsole(messages: CapturedConsoleMessage[], sensitiveValues: string[]) {
  const output = messages.map(({ text, type }) => `${type}:${text}`).join("\n");
  const containsExactValue = sensitiveValues.some((value) => output.includes(value));
  const matchedPatternIds = SENSITIVE_CONSOLE_PATTERNS.filter(({ pattern }) =>
    pattern.test(output),
  ).map(({ id }) => id);

  if (containsExactValue || matchedPatternIds.length > 0) {
    const protectedClasses = [
      ...(containsExactValue ? ["exact-fixture-value"] : []),
      ...matchedPatternIds,
    ].join(",");
    const messageTypes = [...new Set(messages.map(({ type }) => type))].sort().join(",");
    throw new Error(
      `Authenticated staging browser output contained a protected value (classes: ${protectedClasses}; message types: ${messageTypes}).`,
    );
  }
}

function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Authenticated staging browser environment is incomplete.");
  return value;
}
