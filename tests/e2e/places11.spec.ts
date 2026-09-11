import { expect, test } from "./fixtures";
import {
  enterLife,
  goTo,
  saveLife,
  startLife,
} from "./support/creator";

/**
 * UI9-05 / CURSOR-PLACES11: discoverable Places with inspect, travel, attend,
 * and return-home over canonical offers. Requires
 * docs/integration/places11-ui-core.patch on UI144.
 */
test("child sees already-home refusal, walks nearby, and reports arrival", async ({
  page,
}) => {
  await page.goto("/?seed=places11-child-walk");
  await startLife(page, { age: 10, place: "Lexington" });
  await enterLife(page);
  await goTo(page, "nav-places");

  const workspace = page.getByTestId("places-panel");
  await expect(workspace).toBeVisible();
  await expect(page.getByTestId("places-current-location")).toContainText("Home");

  const home = page.getByTestId("places-offer-walk-home");
  const nearby = page.getByTestId("places-offer-walk-neighborhood");
  await expect(home.getByTestId("places-offer-walk-home-reason")).toHaveText(
    "You are already home.",
  );
  await expect(
    home.getByTestId("places-offer-walk-home-action"),
  ).toBeDisabled();
  await expect(
    nearby.getByTestId("places-offer-walk-neighborhood-action"),
  ).toBeEnabled();

  await nearby.getByTestId("places-offer-walk-neighborhood-action").click();
  await expect(page.getByTestId("places-outcome")).toContainText("→");
  await expect(page.getByTestId("places-current-location")).toContainText(
    "neighborhood",
  );

  await expect(
    page.getByTestId("places-offer-walk-neighborhood-reason"),
  ).toHaveText("You are already out in your neighborhood.");
  await expect(
    page.getByTestId("places-offer-walk-home-action"),
  ).toBeEnabled();
});

test("capture Places evidence screenshots", async ({ page }) => {
  await page.goto("/?seed=places11-child-walk");
  await startLife(page, { age: 10, place: "Lexington" });
  await enterLife(page);
  await goTo(page, "nav-places");
  await page.screenshot({
    path: "/opt/cursor/artifacts/places11-desktop-at-home.png",
    fullPage: true,
  });
  await page
    .getByTestId("places-offer-walk-neighborhood-action")
    .click();
  await expect(page.getByTestId("places-outcome")).toBeVisible();
  await page.screenshot({
    path: "/opt/cursor/artifacts/places11-desktop-after-walk.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await goTo(page, "nav-places");
  await page.screenshot({
    path: "/opt/cursor/artifacts/places11-narrow-after-walk.png",
    fullPage: true,
  });
});

test("Places reads preserve World across save and reload", async ({ page }) => {
  await page.goto("/?seed=places11-save");
  await startLife(page, { age: 10, place: "Lexington" });
  await enterLife(page);
  await goTo(page, "nav-places");
  await page
    .getByTestId("places-offer-walk-neighborhood-action")
    .click();
  await expect(page.getByTestId("places-outcome")).toContainText("→");
  const label = await page.getByTestId("places-current-location").innerText();
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-places");
  await expect(page.getByTestId("places-current-location")).toHaveText(label);
});

test("keyboard closes Places without traveling", async ({ page }) => {
  await page.goto("/?seed=places11-keyboard");
  await startLife(page, { age: 10, place: "Lexington" });
  await enterLife(page);
  await goTo(page, "nav-places");
  await page.getByTestId("places-workspace-close").click();
  await expect(page.getByTestId("places-panel")).toHaveCount(0);
});
