import { expect, test, type Page } from "@playwright/test";

import { enterLife, openElsewhere, startLife } from "./support/creator";
import { GIVEN_NAME_GENERATION_POOLS_V1 } from "../../src/simulation/names-data";

/**
 * The 2026-09-06 owner play, repaired, in the browser it failed in.
 *
 * Every check here is a thing the owner actually saw and rejected: a camera
 * that flashed and re-cropped between screens, a Male character generated as
 * "Camila", an opening that repeated the setup form back, and a Kentucky life
 * told nobody had written down the offices where it lived.
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

/** The painted room: its element identity and the transform it is cropped by. */
async function cameraState(page: Page) {
  return page.evaluate(() => {
    const plate = document.querySelector<HTMLElement>(
      "[data-testid='title-tableau'], .title-tableau, .ambient-tableau",
    );
    if (!plate) return null;
    const style = window.getComputedStyle(plate);
    const box = plate.getBoundingClientRect();
    return {
      transform: style.transform,
      width: Math.round(box.width),
      height: Math.round(box.height),
    };
  });
}

test.describe("the opening is one continuous presentation", () => {
  test("keeps the same room mounted from the title into the creator", async ({
    page,
  }) => {
    await freshBrowser(page);

    // Mark the live plate. If the node survives the route change, the mark
    // survives with it; a remount would drop it, which is the shutter.
    const marked = await page.evaluate(() => {
      const plate = document.querySelector<HTMLElement>(
        "[data-testid='title-tableau'], .title-tableau, .ambient-tableau",
      );
      if (!plate) return false;
      plate.dataset.continuityMark = "held";
      return true;
    });
    expect(marked).toBe(true);

    const before = await cameraState(page);
    await page.getByTestId("new-game").click();
    await expect(page.getByTestId("setup-screen")).toBeVisible();

    const stillThere = await page.evaluate(
      () =>
        document.querySelector<HTMLElement>("[data-continuity-mark='held']") !==
        null,
    );
    expect(stillThere).toBe(true);

    // Same element, same crop: no re-cover, no jump.
    expect(await cameraState(page)).toStrictEqual(before);
  });

  test("never renders the creator with no room behind it", async ({ page }) => {
    await freshBrowser(page);
    await page.getByTestId("new-game").click();
    await expect(page.getByTestId("setup-screen")).toBeVisible();
    const painted = await page.evaluate(
      () =>
        document.querySelector(
          "[data-testid='title-tableau'], .title-tableau, .ambient-tableau",
        ) !== null,
    );
    expect(painted).toBe(true);
  });

  test("does not move the life backdrop when overlays open and close", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 34, place: "Kentucky", gender: "male" });
    await enterLife(page);

    const geometry = async () =>
      page.evaluate(() => {
        const scene = document.querySelector<HTMLElement>(
          "[data-testid='scene-backdrop'], .scene-backdrop",
        );
        if (!scene) return null;
        const style = window.getComputedStyle(scene);
        const box = scene.getBoundingClientRect();
        return {
          transform: style.transform,
          width: Math.round(box.width),
          height: Math.round(box.height),
        };
      });

    const closed = await geometry();
    await openElsewhere(page, "day");
    await expect(page.getByTestId("ordinary-section")).toBeVisible();
    expect(await geometry()).toStrictEqual(closed);
  });
});

test.describe("the life the player asked for is the life they get", () => {
  test("generates a name that agrees with the gender that was stated", async ({
    page,
  }) => {
    await freshBrowser(page);
    // Male, both names left blank — the exact owner-play input.
    await startLife(page, { age: 34, place: "Kentucky", gender: "male" });
    await expect(page.getByTestId("play-screen")).toBeVisible();

    // Read the opening BEFORE stepping inside: "Step inside" is what dismisses
    // it, so asserting after would be asserting about a screen that is gone.
    const introduction = page.getByTestId("life-introduction");
    await expect(introduction).toBeVisible();

    // "Camila" was the rejected output, but the seed is fresh every run, so
    // asserting one absent name would prove almost nothing. The check is that
    // whatever name was drawn is one this stated gender can produce.
    const shown = await introduction.innerText();
    const drawn = GIVEN_NAME_GENERATION_POOLS_V1.male.find((name) =>
      new RegExp(`\\b${name}\\b`).test(shown),
    );
    expect(
      drawn,
      `no male-pool given name appeared in the opening:\n${shown}`,
    ).toBeDefined();
  });

  test("grounds the life in its own records before the first choice", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 34, place: "Kentucky", gender: "male" });

    const grounding = page.getByTestId("life-grounding");
    await expect(grounding).toBeVisible();
    // Something beyond the age and the place the player just typed in.
    const lines = await grounding.locator("p").allInnerTexts();
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toMatch(/^You're 34/);
    }
  });
});

test.describe("a Lexington life can stand for a Kentucky seat", () => {
  test("offers candidacy through the state above the city", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 34, place: "Lexington", gender: "male" });
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await enterLife(page);
    await openElsewhere(page, "day");
    await expect(page.getByTestId("ordinary-section")).toBeVisible();

    // The owner saw the refusal here. There must now be something to file for,
    // and no message claiming nobody has written the offices down.
    await expect(page.getByTestId("no-campaign")).toHaveCount(0);
    await expect(page.getByTestId("file-candidacy")).toBeVisible();
  });

  test("reaches fundraising, outreach and the election from that life", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 34, place: "Lexington", gender: "male" });
    await enterLife(page);
    await openElsewhere(page, "day");

    await page.getByTestId("file-candidacy").click();
    await page.getByTestId("campaign-fundraising").click();
    await expect(page.getByTestId("campaign-treasury")).toBeVisible();
    await page.getByTestId("pass-day").click();
    await page.getByTestId("campaign-outreach").click();
    await expect(page.getByTestId("campaign-memo")).toBeVisible();

    for (let day = 0; day < 45; day += 1) {
      if (await page.getByTestId("campaign-result").isVisible()) break;
      await page.getByTestId("pass-day").click();
    }
    await expect(page.getByTestId("campaign-result")).toBeVisible();
    // Whatever the result, the life goes on.
    await expect(page.getByTestId("play-screen")).toBeVisible();
  });
});
