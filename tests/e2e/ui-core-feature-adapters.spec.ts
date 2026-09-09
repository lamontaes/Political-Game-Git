import { expect, test } from "./fixtures";
import { enterLife, fillCreator, goTo, startLife } from "./support/creator";

test("normal Day exposes the frozen study/work adapter and scheduled sessions reach Calendar", async ({
  page,
}) => {
  await page.goto("/?seed=ui-core-life-adapter");
  await startLife(page, {
    age: 35,
    route: "custom",
    household: "shares-a-home",
  });
  await enterLife(page);
  await goTo(page, "elsewhere-day");
  const paths = page.getByRole("region", { name: "Education and work" });
  await expect(paths).toBeVisible();
  await paths
    .getByRole("button", { name: /^Enroll in/ })
    .first()
    .click();
  await paths
    .getByRole("button", { name: "Schedule next session", exact: true })
    .click();
  await goTo(page, "nav-calendar");
  await expect(
    page.locator('[data-testid^="calendar-entry-"]'),
  ).not.toHaveCount(0);
  await page.locator('[data-testid^="calendar-pin-"]').first().click();
  await expect(page.locator('[data-testid^="pin-commitment:"]')).toBeVisible();
});

test("Custom judicial workplace uses the normal World, Work and save route", async ({
  page,
}) => {
  await page.goto("/?seed=ui-core-judicial-adapter");
  await fillCreator(page, { age: 35, route: "custom" });
  await page.getByTestId("creator-summary-background").click();
  await page.getByTestId("judicial-office-start").click();
  await page.getByTestId("creator-continue-background").click();
  await page.getByTestId("whoareyou-play").click();
  await page.getByTestId("begin").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
  await page
    .getByRole("button", { name: "Check office correspondence", exact: true })
    .click();
  await expect(
    page.locator(".judicial-office-choices button").first(),
  ).toBeEnabled();
  await page.locator(".judicial-office-choices button").first().press("Enter");
  await expect(
    page.getByRole("button", {
      name: "Prepare the follow-up note",
      exact: true,
    }),
  ).toBeVisible();
  await goTo(page, "keep-world");
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
  await expect(
    page.getByRole("button", {
      name: "Prepare the follow-up note",
      exact: true,
    }),
  ).toBeVisible();
});
