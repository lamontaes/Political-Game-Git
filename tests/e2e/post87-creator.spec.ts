import { expect, test, type Page } from "@playwright/test";

import { openCreator } from "./support/creator";

/**
 * The post-#87 creator, in a browser.
 *
 * The third human play returned a creator that still read as a web form on a
 * white card: it clipped as sections accumulated and had to scroll, it asked a
 * normal start to compose its own biography, and it carried developer copy. The
 * assertions here are the ones a unit test cannot make — what actually fits on
 * the screen, and what a player is and is not asked.
 */

async function freshBrowser(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
  await page.reload();
}

/** Walks a normal start as far as the "Who are you?" step. */
async function walkToWhoAreYou(page: Page) {
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await expect(page.getByTestId("creator-stage-character")).toBeVisible();
  await page.getByTestId("start-age").fill("10");
  await page.getByTestId("creator-continue-character").click();
  await expect(page.getByTestId("creator-stage-place")).toBeVisible();
  await page.getByTestId("place-search").fill("Kentu");
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: /Kentucky/i })
    .first()
    .click();
  await page.getByTestId("creator-continue-place").click();
  await expect(page.getByTestId("creator-stage-whoareyou")).toBeVisible();
}

/** How far the page can be scrolled vertically. Zero means nothing is clipped. */
async function verticalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight,
  );
}

test.describe("The creator is a panel on the room, not a scrolling form", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "small desktop", width: 1180, height: 760 },
    { name: "tablet", width: 1024, height: 768 },
  ]) {
    test(`fits the active step without clipping at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await freshBrowser(page);
      await walkToWhoAreYou(page);

      // The whole active creator fits inside the viewport: nothing needs
      // scrolling to be reached, which is the clipping the third play hit.
      expect(await verticalOverflow(page)).toBeLessThanOrEqual(1);

      // Begin, Next-equivalent and Back all sit inside the frame.
      for (const control of ["begin", "whoareyou-answer", "whoareyou-play"]) {
        const box = await page.getByTestId(control).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      }
      await expect(page.getByRole("button", { name: "Back" })).toBeVisible();

      // The creator sits on the LEFT of the room.
      const panel = await page.getByTestId("setup-screen").boundingBox();
      expect(panel).not.toBeNull();
      expect(panel!.x + panel!.width / 2).toBeLessThan(viewport.width / 2);
    });
  }

  test("collapses finished steps to breadcrumbs instead of stacking them", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await walkToWhoAreYou(page);

    // The finished steps are one-line summaries, and the steps they replaced
    // are not still mounted full-height below the current one.
    for (const step of ["route", "character", "place"]) {
      await expect(page.getByTestId(`creator-summary-${step}`)).toBeVisible();
    }
    await expect(page.getByTestId("creator-stage-character")).toHaveCount(0);
    await expect(page.getByTestId("creator-stage-place")).toHaveCount(0);

    // Reopening a breadcrumb makes that step current again.
    await page.getByTestId("creator-summary-character").click();
    await expect(page.getByTestId("creator-stage-character")).toBeVisible();
  });

  test("does not ask a normal start to compose its own biography", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await walkToWhoAreYou(page);

    // No household, no work, no depth question anywhere on the normal route:
    // those are generated after Begin (Task E).
    for (const control of [
      "office-start",
      "lives-alone",
      "shares-a-home",
      "depth-childhood",
      "creator-stage-background",
    ]) {
      await expect(page.getByTestId(control)).toHaveCount(0);
    }
  });

  test("carries none of the removed developer copy or controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await openCreator(page);
    await expect(page.getByTestId("creator-stage-route")).toBeVisible();

    const routeText = await page.getByTestId("setup-screen").innerText();
    expect(routeText).not.toMatch(/how this life gets made/i);
    expect(routeText).not.toMatch(/everyday life only, for now/i);

    // On the character step: a name field with no permanent placeholder, three
    // genders with no "Leave unspecified", and no permanent pronoun row.
    await page.getByTestId("start-normal").click();
    await expect(page.getByTestId("creator-stage-character")).toBeVisible();

    const firstName = page
      .getByTestId("creator-stage-character")
      .locator("input[type=text]")
      .first();
    expect(await firstName.getAttribute("placeholder")).toBeFalsy();

    const characterText = await page
      .getByTestId("creator-stage-character")
      .innerText();
    expect(characterText).not.toMatch(/leave unspecified/i);
    expect(characterText).not.toMatch(/leave blank to be given one/i);

    await expect(
      page.getByTestId("gender-choices").getByRole("button"),
    ).toHaveCount(3);
    // The pronoun buttons live inside a collapsed disclosure, not a row on show.
    await expect(page.getByTestId("pronoun-choices")).not.toBeVisible();
  });
});
