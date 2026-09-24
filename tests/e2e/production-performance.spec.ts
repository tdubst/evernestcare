import { expect, test } from "@playwright/test";

const routeReadinessBudgetMs = 5_000;

test("production entry boundaries meet the route-readiness budget", async ({ page }, testInfo) => {
  const routes = [
    { heading: "Evernest Care", path: "/" },
    { heading: "Sign in to your care workspace", path: "/sign-in" },
    { heading: "Sign in required", path: "/today" },
  ];
  let slowestRouteMs = 0;

  for (const route of routes) {
    const startedAt = Date.now();
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    const readyElement =
      route.path === "/"
        ? page.getByText(route.heading, { exact: true }).first()
        : page.getByRole("heading", { name: route.heading }).first();
    await expect(readyElement).toBeVisible();
    const readyMs = Date.now() - startedAt;
    slowestRouteMs = Math.max(slowestRouteMs, readyMs);

    expect(readyMs, `${route.path} exceeded the route-readiness budget`).toBeLessThanOrEqual(
      routeReadinessBudgetMs,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
      `${route.path} overflowed while becoming ready`,
    ).toBe(false);
  }

  console.log(
    `Production performance budget passed for ${testInfo.project.name}; slowest route ${slowestRouteMs} ms.`,
  );
});
