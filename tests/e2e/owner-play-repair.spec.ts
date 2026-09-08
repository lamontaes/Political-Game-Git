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

  test("keeps each decoded room and its camera mounted through two ambient transitions", async ({
    page,
  }) => {
    await page.clock.install();
    await freshBrowser(page);

    const current = page.getByTestId("title-tableau-stage");
    await expect(page.getByTestId("title-tableau-plate")).toBeVisible();
    await current.evaluate((stage) => {
      (stage as HTMLElement).dataset.continuityMark = "first-room";
    });

    await page.clock.fastForward(15_100);
    await expect(
      page.getByTestId("title-tableau-stage-leaving"),
    ).toHaveAttribute("data-continuity-mark", "first-room");

    const second = page.getByTestId("title-tableau-stage");
    await expect
      .poll(async () =>
        second
          .getByTestId("title-tableau-plate")
          .evaluate(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth,
          ),
      )
      .toBeGreaterThan(0);
    const secondCamera = await second
      .getByTestId("title-tableau-camera")
      .evaluate((camera) => {
        (camera as HTMLElement).dataset.cameraContinuityMark = "held";
        return (camera as HTMLElement).style.transform;
      });
    await second.evaluate((stage) => {
      (stage as HTMLElement).dataset.continuityMark = "second-room";
    });

    // This is the transition the owner saw go black. The room that was the
    // arriving stage at the first change must become the leaving stage at the
    // second change without React replacing its decoded image or camera node.
    await page.clock.fastForward(15_000);
    const leaving = page.getByTestId("title-tableau-stage-leaving");
    await expect(leaving).toHaveAttribute(
      "data-continuity-mark",
      "second-room",
    );
    const heldCamera = leaving.getByTestId("title-tableau-camera");
    await expect(heldCamera).toHaveAttribute(
      "data-camera-continuity-mark",
      "held",
    );
    expect(
      await heldCamera.evaluate(
        (camera) => (camera as HTMLElement).style.transform,
      ),
    ).toBe(secondCamera);
    expect(
      await leaving
        .getByTestId("title-tableau-plate")
        .evaluate(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
    ).toBe(true);
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

    // The introduction names family members, not the player. Read the
    // persistent player plaque so a parent's generated name cannot satisfy or
    // fail this assertion by accident.
    const shown = await page
      .getByTestId("life-hud")
      .getByTestId("person-portrait")
      .locator("strong")
      .innerText();
    const givenName = shown.split(" ")[0];
    expect(GIVEN_NAME_GENERATION_POOLS_V1.male).toContain(givenName);
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

    const yearIn = (line: string) => Number(line.match(/\b(\d{4})\b/)?.[1]);
    const elementary = lines.find((line) => /elementary school/i.test(line));
    const middle = lines.find((line) => /middle school/i.test(line));
    const high = lines.find((line) => /high school/i.test(line));
    const work = lines.find((line) => /Neighborhood Market/i.test(line));
    expect(elementary).toBeDefined();
    expect(middle).toBeDefined();
    expect(high).toBeDefined();
    expect(work).toBeDefined();
    expect(yearIn(middle!)).toBeGreaterThan(yearIn(elementary!));
    expect(yearIn(high!)).toBeGreaterThan(yearIn(middle!));
    expect(yearIn(work!)).toBeGreaterThan(yearIn(high!));
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

  test("explains same-day exhaustion and restores campaign actions tomorrow", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 34, place: "Lexington", gender: "male" });
    await enterLife(page);
    await openElsewhere(page, "day");
    await page.getByTestId("file-candidacy").click();

    // Three sessions fit before the already-posted evening meeting. A fourth
    // does not; that is allowed exhaustion, and every disabled action says why.
    // Exercise both native input paths on the exact owner route.
    await page.getByTestId("campaign-fundraising").click();
    await page.getByTestId("campaign-outreach").focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("campaign-advertising").click();
    for (const kind of ["fundraising", "outreach", "advertising"] as const) {
      const action = page.getByTestId(`campaign-${kind}`);
      await expect(action).toBeDisabled();
      await expect(action).toContainText(/today is already spoken for/i);
    }
    await expect(page.getByTestId("pass-day")).toBeEnabled();

    // Campaign time does not leak into the ordinary conversation surface.
    await openElsewhere(page, "people");
    const intent = page
      .getByTestId("conversation-intents")
      .first()
      .getByRole("button")
      .first();
    await expect(intent).toBeEnabled();

    await openElsewhere(page, "day");
    await page.getByTestId("pass-day").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("campaign-fundraising")).toBeEnabled();
    await expect(page.getByTestId("campaign-outreach")).toBeEnabled();
  });

  test("lists a campaign opponent as relevant without silently pinning them", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await freshBrowser(page);
    await startLife(page, { age: 34, place: "Lexington", gender: "male" });
    await enterLife(page);
    await openElsewhere(page, "day");
    await page.getByTestId("file-candidacy").click();
    const opponentLine = (
      await page.getByTestId("campaign-opponents").innerText()
    ).trim();
    const opponentName = opponentLine
      .replace(/^Running against\s+/i, "")
      .replace(/\.$/, "");

    for (let day = 0; day < 45; day += 1) {
      if (await page.getByTestId("campaign-result").isVisible()) break;
      await page.getByTestId("pass-day").click();
    }
    await expect(page.getByTestId("campaign-result")).toBeVisible();

    const opponent = page
      .getByTestId("people-rail")
      .locator("li")
      .filter({ hasText: opponentName });
    await expect(opponent).toHaveCount(1);
    // The rail is a relevant-people list. The empty star is the separate,
    // deliberate hold state; discovery must not press it for the player.
    const pin = opponent.locator("[data-testid^='rail-pin-']");
    await expect(pin).toHaveAttribute("aria-pressed", "false");
    await expect(pin).toHaveAttribute("aria-label", "Pin");
  });
});
