import { chromium } from "@playwright/test";

const productionUrl = parseProductionUrl(process.env.PRODUCTION_BROWSER_URL?.trim());
const expectation = process.env.PRODUCTION_BROWSER_EXPECTATION?.trim() || "production";

if (!productionUrl) {
  fail("PRODUCTION_BROWSER_URL must be a public HTTPS URL");
}

if (!new Set(["production", "rollback"]).has(expectation)) {
  fail("PRODUCTION_BROWSER_EXPECTATION must be production or rollback");
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const failures = [];

page.on("pageerror", () => failures.push("browser page error"));
page.on("console", (message) => {
  if (message.type() === "error") failures.push("browser console error");
});
page.on("requestfailed", (request) => {
  const resourceType = request.resourceType();
  if (["document", "script", "stylesheet", "font"].includes(resourceType)) {
    failures.push(`failed ${resourceType} request`);
  }
});
page.on("response", (response) => {
  const resourceType = response.request().resourceType();
  if (
    response.status() >= 400 &&
    ["document", "script", "stylesheet", "font"].includes(resourceType)
  ) {
    failures.push(`failed ${resourceType} response`);
  }
});

try {
  const entryResponse = await page.goto(new URL("/", productionUrl).href, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  expectSecurityHeaders(entryResponse?.headers(), "production entry headers");
  await expectVisible(page.getByText("Evernest Care").first(), "application shell");
  await expectNoOverflow(page, "production entry layout");

  if (expectation === "production") {
    await expectVisible(page.getByRole("link", { name: "Sign in" }), "production sign-in entry");

    const signInResponse = await page.goto(new URL("/sign-in", productionUrl).href, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    expectSecurityHeaders(signInResponse?.headers(), "sign-in headers");
    await expectVisible(
      page.getByRole("heading", { name: "Sign in to your care workspace" }),
      "sign-in screen",
    );
    await expectVisible(page.getByLabel("Email"), "sign-in email field");
    await expectVisible(page.getByLabel("Password"), "sign-in password field");
    await expectNoOverflow(page, "sign-in layout");

    const protectedResponse = await page.goto(new URL("/today", productionUrl).href, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    expectSecurityHeaders(protectedResponse?.headers(), "protected route headers");
    await expectVisible(
      page.getByRole("heading", { name: "Sign in required" }),
      "protected route boundary",
    );
    await expectNoOverflow(page, "protected route layout");
  }
} catch {
  failures.push("browser verification did not complete");
} finally {
  await browser.close();
}

if (failures.length > 0) {
  fail([...new Set(failures)].join(", "));
}

console.log(
  expectation === "rollback"
    ? "Production rollback browser verification passed."
    : "Production browser verification passed.",
);

async function expectVisible(locator, label) {
  const visible = await locator
    .waitFor({ state: "visible", timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) {
    failures.push(`${label} unavailable`);
  }
}

async function expectNoOverflow(pageInstance, label) {
  const hasOverflow = await pageInstance
    .evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    .catch(() => true);
  if (hasOverflow) failures.push(`${label} overflow`);
}

function expectSecurityHeaders(headers, label) {
  if (
    !headers ||
    !headers["content-security-policy"]?.includes("default-src 'self'") ||
    headers["x-content-type-options"] !== "nosniff" ||
    headers["x-frame-options"] !== "DENY" ||
    headers["referrer-policy"] !== "strict-origin-when-cross-origin" ||
    !headers["permissions-policy"]?.includes("camera=()")
  ) {
    failures.push(`${label} unavailable`);
  }
}

function parseProductionUrl(value) {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const isPublicHost =
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1" &&
      parsed.hostname !== "[::1]";
    return parsed.protocol === "https:" && isPublicHost ? parsed : null;
  } catch {
    return null;
  }
}

function fail(message) {
  console.error(`Production browser verification blocked: ${message}.`);
  process.exit(1);
}
