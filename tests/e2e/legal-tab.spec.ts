import { expect, test } from "./fixtures";

import { enterLife, goTo, startLife } from "./support/creator";

/*
 * Claude CTO, 1:54 a.m., September 29, 2026: the player's own record has a
 * Legal tab, filled from the court's records (Build 26's projection). Other
 * people's records have no such tab.
 */
test("the player's own record opens a Legal tab from the court's records", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await startLife(page, { place: "Anchorage", state: "Alaska", age: 36 });
  await enterLife(page);

  await goTo(page, "elsewhere-people");
  const you = page
    .locator('[data-testid^="people-web-node-"]')
    .filter({ has: page.locator('circle[aria-label="You"]') });
  await you.locator("circle").click();
  const card = page.getByTestId("quick-dossier");
  await expect(card).toBeVisible();
  await card.getByTestId("person-full-record").click();

  const record = page.getByTestId("person-workspace");
  await expect(record).toBeVisible();
  const tabs = record.getByTestId("self-record-tabs");
  await expect(tabs.getByRole("tab", { name: "Record" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await tabs.getByRole("tab", { name: "Legal" }).click();
  const legal = record.getByTestId("legal-record");
  await expect(legal).toBeVisible();
  await expect(legal.getByTestId("legal-standing")).toHaveText(
    "No one has charged you with a crime.",
  );
  await expect(legal.getByTestId("legal-cases-empty")).toBeVisible();
  await expect(legal.getByTestId("legal-sentences-empty")).toBeVisible();

  // Back to the ordinary record.
  await tabs.getByRole("tab", { name: "Record" }).click();
  await expect(record.getByTestId("legal-record")).toHaveCount(0);
});
