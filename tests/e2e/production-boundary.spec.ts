import { expect, test } from "@playwright/test";

test("production entry uses invite-only sign-in instead of beta simulation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Open beta workspace")).toHaveCount(0);
  await expect(page.getByText("Get started")).toHaveCount(0);

  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Access your care workspace" })).toBeVisible();
  await expect(page.getByText("Evelyn")).toHaveCount(0);

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("production protected routes fail closed without a session", async ({ page }) => {
  for (const route of ["/today", "/calendar", "/messages", "/vault", "/care-team"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
    await expect(page.getByText("Beta workspace ready")).toHaveCount(0);
    await expect(page.getByText("Care visit")).toHaveCount(0);
  }
});
