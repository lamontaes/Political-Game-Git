import { expect, test } from "./fixtures";

import { enterLife, goTo, startLife } from "./support/creator";

/*
 * Claude CTO, 8:00 a.m., September 29, 2026: a law's effect is readable
 * wherever the player looks. Politics → Issues and budget → Conditions reads
 * how the player's state is doing on each condition the world keeps, and what
 * is moving it. Reading it passes no time.
 */
test("Conditions shows how the home state is doing, and passes no time", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await startLife(page, { place: "Santa Fe", state: "New Mexico", age: 44 });
  await enterLife(page);
  const when = await page.getByTestId("story-when").textContent();

  await goTo(page, "nav-politics-conditions");
  const panel = page.getByTestId("place-conditions");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading")).toHaveText(/^How .+ is doing$/);
  const uninsured = panel.getByTestId("place-condition-health.uninsured-pct");
  await expect(uninsured).toContainText(
    "Share of people without health insurance",
  );
  await expect(uninsured.getByTestId("place-condition-now")).toHaveText(
    /^\d+\.\d%$/,
  );
  expect(
    await panel.locator('[data-testid^="place-condition-"]').count(),
  ).toBeGreaterThan(10);
  await expect(page.getByTestId("story-when")).toHaveText(when ?? "");
});
