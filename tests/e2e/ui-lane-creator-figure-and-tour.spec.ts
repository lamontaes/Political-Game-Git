import { expect, test, type Page } from "./fixtures";

import { fillCreator } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";

/*
 * Two things Lamontae saw on build 13a0757f.
 *
 * The creator's Reset appearance / Undo / Begin row sat over the standing
 * figure's legs, and the morning note opened over the first stop of the
 * opening tour. The note was removed entirely; the figure remains measured
 * in a real window at the sizes the owner plays at.
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

async function reachAppearance(page: Page) {
  await freshBrowser(page);
  await fillCreator(page, {
    route: "normal",
    age: 25,
    state: "Kentucky",
    place: "Lexington",
  });
  await expect(page.getByTestId("creator-engine-figure")).toBeVisible();
}

const MORNING_NOTE_SEED = "session8-remove-morning-note-2026-10-06";
const MORNING_NOTE_PLACE = drawRandomPlace(
  MORNING_NOTE_SEED,
  (place) => place.scope === "locality",
);
const MORNING_NOTE_STATE_NAME = (() => {
  const stateKey = MORNING_NOTE_PLACE.stateJurisdictionKey;
  const state = stateKey ? stateJurisdictionForKey(stateKey) : null;
  if (!state)
    throw new Error(
      `seed ${MORNING_NOTE_SEED} must select a locality with a state`,
    );
  return state.name;
})();

async function reachRandomAppearance(page: Page) {
  await freshBrowser(page);
  await fillCreator(page, {
    route: "normal",
    age: 25,
    state: MORNING_NOTE_STATE_NAME,
    place: MORNING_NOTE_PLACE.displayName,
  });
  await expect(page.getByTestId("creator-engine-figure")).toBeVisible();
}

/** The whole figure shows: inside its column, above the action row. */
async function expectWholeFigure(page: Page, height: number) {
  const layout = await page.evaluate(() => {
    const box = (selector: string) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    };
    return {
      stage: box(".engine-creator-stage"),
      column: box(".kit41-creator-preview"),
      bar: box(".kit41-creator .game-setup-actions"),
    };
  });
  expect(layout.stage, "figure stage").not.toBeNull();
  expect(layout.column, "figure column").not.toBeNull();
  expect(layout.bar, "Reset/Undo/Begin row").not.toBeNull();
  const { stage, column, bar } = layout as {
    [key: string]: { top: number; bottom: number; height: number };
  };
  expect(stage.height).toBeGreaterThan(200);
  expect(stage.top).toBeGreaterThanOrEqual(column.top - 0.5);
  expect(stage.bottom).toBeLessThanOrEqual(column.bottom + 0.5);
  expect(stage.bottom).toBeLessThanOrEqual(bar.top + 0.5);
  expect(bar.bottom).toBeLessThanOrEqual(height);
}

test("the creator shows the whole figure above Begin from 800 to 1300 tall", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await reachAppearance(page);
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1440, height: 1000 },
    { width: 1440, height: 1300 },
    { width: 1366, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expectWholeFigure(page, viewport.height);
  }
  const value = page.locator(".engine-appearance-value").first();
  await expect(value).toBeVisible();
  const style = await value.evaluate((node) => {
    const computed = getComputedStyle(node);
    return {
      opacity: Number(computed.opacity),
      color: computed.color,
      background: computed.backgroundColor,
    };
  });
  expect(style.opacity).toBe(1);
  expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1440, height: 1000 },
]) {
  test(`morning note is removed in ${MORNING_NOTE_PLACE.displayName} (seed ${MORNING_NOTE_SEED}) at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    await page.setViewportSize(viewport);
    await reachRandomAppearance(page);
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("world-orientation")).toBeVisible({
      timeout: 120_000,
    });
    await expect(page.getByTestId("morning-thought")).toHaveCount(0);
    const tour = page.getByTestId("world-orientation");
    for (let stop = 0; stop < 8 && (await tour.isVisible()); stop += 1) {
      await expect(page.getByTestId("morning-thought")).toHaveCount(0);
      await page.getByTestId("orientation-next").click();
    }
    await expect(tour).toBeHidden();
    await expect(page.getByTestId("morning-thought")).toHaveCount(0);
    const screenshot = testInfo.outputPath("morning-note-removed.png");
    await page.screenshot({ path: screenshot, fullPage: false });
    await testInfo.attach("morning-note-removed", {
      path: screenshot,
      contentType: "image/png",
    });
  });
}

/*
 * The room's way into the moment says what it opens, and it can be clicked.
 * It read "What's happening", and at 1280x800 the corner cluster covered its
 * lower half, so a click on its label landed on the cluster instead.
 */
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1440, height: 1000 },
]) {
  test(`the room's choices button is named and clear of the cluster at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(viewport);
    await reachAppearance(page);
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("world-orientation")).toBeVisible({
      timeout: 120_000,
    });
    await page.getByTestId("orientation-skip").click();
    const opener = page.getByTestId("open-moment");
    await expect(opener).toBeVisible();
    await expect(opener).toContainText("Your choices here");
    await expect(opener).not.toContainText("happening");
    const clear = await opener.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const points = [
        [rect.left + 8, rect.top + 8],
        [rect.left + 8, rect.bottom - 8],
        [rect.right - 8, rect.bottom - 8],
      ];
      return points.every(([x, y]) => {
        const hit = document.elementFromPoint(x!, y!);
        return hit !== null && node.contains(hit);
      });
    });
    expect(clear).toBe(true);
    await opener.click();
    await expect(page.getByTestId("story-section")).toBeVisible();
    // Opened, its way back is clear of the cluster too.
    const back = page.getByTestId("pending-life-return");
    await back.click({ trial: true, timeout: 5_000 });
    await back.click();
    await expect(page.getByTestId("story-section")).toHaveCount(0);
  });
}
