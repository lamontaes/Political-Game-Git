import { expect, test } from "./fixtures";

import { drawRandomPlace } from "../support/random-place";
import { goTo, returnToRoom, startLife } from "./support/creator";

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
  await returnToRoom(page);
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

  const layout = page.getByTestId("people-layout");
  const list = page.getByTestId("people-list");
  const dossier = page.getByTestId("people-dossier");
  await expect(layout).toBeVisible();
  await expect(list).toBeVisible();
  await expect(dossier).toBeVisible();
  await expect(quickDossier).toBeVisible();
  await expect(quickDossier).not.toContainText("Connected people");
  await expect(page.getByTestId("people-web-connection")).toHaveCount(0);
  await expect(dossier).not.toContainText("You live in the same household.");
  const dossierParagraphs = await dossier.locator("p").allTextContents();
  expect(
    dossierParagraphs.some((text) =>
      /^(?:They are|He is|She is) your /.test(text),
    ),
  ).toBe(false);

  const first = list.locator('[data-testid^="people-person-"]').first();
  const personId = ((await first.getAttribute("data-testid")) ?? "").replace(
    "people-person-",
    "",
  );
  const name = await first.locator("strong").first().textContent();
  expect(personId).not.toBe("");
  expect(name).not.toBeNull();
  await first.click();
  await expect(dossier).toHaveAttribute("data-person-id", personId);
  await expect(dossier.getByRole("heading", { level: 2 })).toHaveText(name!);
  await page.screenshot({
    path: test.info().outputPath("people-split-directory.png"),
    fullPage: true,
  });

  await page.getByText("Search", { exact: true }).click();
  await page.getByTestId("people-search").fill(name!);
  await expect(first).toBeVisible();

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
