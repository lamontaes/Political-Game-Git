import { expect, test, type Page } from "@playwright/test";

import { enterLife, openCreator, startLife } from "./support/creator";

/**
 * The fifth human-play repairs: viewport-bound creator, and People surfaces
 * with an obvious way out.
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

async function reachPlaceSearch(page: Page) {
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await expect(page.getByTestId("creator-stage-character")).toBeVisible();
  await page.getByTestId("creator-continue-character").click();
  await expect(page.getByTestId("creator-stage-place")).toBeVisible();
}

test.describe("The creator stays inside the viewport", () => {
  for (const viewport of [
    { name: "wide", width: 1536, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
    { name: "small", width: 1280, height: 720 },
  ]) {
    test(`a long place search scrolls internally and keeps Next in view at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await freshBrowser(page);
      await reachPlaceSearch(page);

      // A common town name returns many results across states.
      await page.getByTestId("place-search").fill("Springfield");
      const choices = page.getByTestId("place-choices");
      await expect(choices.getByRole("button").first()).toBeVisible();

      // The results are a bounded, internally-scrolling region — they do not
      // grow the page (the Bloomington defect).
      const scrolls = await choices.evaluate(
        (node) => node.scrollHeight > node.clientHeight + 1,
      );
      expect(scrolls).toBe(true);
      const pageScroll = await page.evaluate(
        () =>
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight,
      );
      expect(pageScroll).toBeLessThanOrEqual(1);

      // Selecting a place keeps its Next reachable without hunting below fold.
      await choices
        .getByRole("button", { name: /Springfield, Illinois/i })
        .first()
        .click();
      const next = page.getByTestId("creator-continue-place");
      await expect(next).toBeVisible();
      const box = await next.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    });
  }
});

test.describe("People surfaces have an obvious way out", () => {
  test("closes with the X, with Escape, and leaves the moment untouched", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await startLife(page, { age: 10 });
    await enterLife(page);

    const momentBefore = await page.getByTestId("story-prose").innerText();

    // Open People, then close with the explicit X.
    await page.getByTestId("elsewhere-people").click();
    const overlay = page.getByTestId("people-overlay");
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId("people-overlay-close")).toBeVisible();
    await page.getByTestId("people-overlay-close").click();
    await expect(overlay).toHaveCount(0);

    // Reopen and close with Escape.
    await page.getByTestId("elsewhere-people").click();
    await expect(overlay).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(overlay).toHaveCount(0);

    // The moment underneath is exactly where it was — nothing was rebuilt.
    await expect(page.getByTestId("story-section")).toBeVisible();
    expect(await page.getByTestId("story-prose").innerText()).toBe(
      momentBefore,
    );
  });
});
