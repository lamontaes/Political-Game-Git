import { expect, test } from "./fixtures";

import { drawRandomPlace } from "../support/random-place";
import { goTo, startLife } from "./support/creator";

test.describe.configure({ timeout: 120_000 });

test("People places the directory beside the selected record", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const place = drawRandomPlace("session36-mr5-people-layout");
  const [town, state] = place.displayName.split(", ");
  if (!town || !state)
    throw new Error(`Unexpected place: ${place.displayName}`);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?seed=session36-mr5-pair-3b7f49631");
  await startLife(page, { age: 34, place: town, state });
  await expect(page.getByTestId("world-orientation")).toBeVisible({
    timeout: 60_000,
  });
  const orientationSkip = page.getByTestId("orientation-skip");
  await orientationSkip.click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 60_000,
  });
  const sceneContact = page
    .locator('[data-testid^="scene-person-person_"]')
    .first();
  await expect(sceneContact).toBeVisible();
  await sceneContact.click();
  const quickDossier = page.getByTestId("quick-dossier");
  await expect(quickDossier).toBeVisible();
  await quickDossier.getByTestId("quick-dossier-full").click();
  await expect(quickDossier).toHaveAttribute("data-expanded", "true");
  await goTo(page, "elsewhere-people");

  const web = page.getByTestId("people-relationship-web");
  const list = page.getByTestId("people-list");
  await expect(web).toBeVisible();
  await expect(list).toHaveCount(0);
  await page.getByTestId("people-view-list").click();
  await expect(list).toBeVisible();
  await expect(web).toHaveCount(0);
  await page.getByTestId("people-view-web").click();
  await expect(web).toBeVisible();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
