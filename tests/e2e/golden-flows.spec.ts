import { expect, test } from "@playwright/test";

test("onboarding advances through every step into the beta workspace", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(
    page.getByRole("heading", { name: "Let's make care easier to follow." }),
  ).toBeVisible();

  for (let step = 1; step <= 7; step += 1) {
    await page.getByTestId("onboarding-continue").click();
    await expect(page).toHaveURL(new RegExp(`/onboarding\\?step=${step}$`));
  }

  await page.getByTestId("onboarding-continue").click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByText("Beta workspace ready")).toBeVisible();
});

test("core beta routes render without horizontal overflow", async ({ page }) => {
  for (const route of [
    "/today",
    "/calendar",
    "/messages",
    "/vault",
    "/care-team",
    "/profile-types",
  ]) {
    await page.goto(route);
    await expect(page.locator("body")).not.toContainText("Preparing beta preview");
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow, `${route} should not overflow horizontally`).toBe(false);
  }
});

test("local preview interactions complete without network-backed writes", async ({ page }) => {
  await page.goto("/calendar");
  await page.getByRole("link", { name: "Add appointment" }).click();
  await expect(page.getByText("No appointment is saved or sent.")).toBeVisible();

  await page.goto("/care-team");
  await page.getByRole("button", { name: /Invite preview/ }).click();
  await page.getByRole("button", { name: "Review local preview" }).click();
  await page.getByRole("button", { name: "Save local preview" }).click();
  await expect(
    page.getByText("Invite preview was prepared without sending a real invitation."),
  ).toBeVisible();

  await page.goto("/vault");
  await page.getByRole("button", { name: "Add placeholder" }).click();
  await page.getByRole("button", { name: "Add document placeholder" }).click();
  await expect(page.getByText("Placeholder added to this beta workspace preview.")).toBeVisible();
});
