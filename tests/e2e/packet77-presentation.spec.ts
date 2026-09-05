import { expect, test, type Page } from "@playwright/test";

import { fillCreator, openCreator, startLife } from "./support/creator";

/**
 * The second human play, answered in a browser.
 *
 * Every assertion here comes from a finding the human returned at
 * `57e56c1`: text overlapping on the title, a menu covering the room, no
 * movement in a screen that was supposed to be a place, a New Game that broke
 * to a blank form with four places laid out as defaults, and a life that
 * opened on a wall of systems instead of a room.
 *
 * They are browser tests rather than unit tests because every one of them is a
 * claim about what reaches the screen, which is exactly the class of claim the
 * unit suites could not make and the playtest therefore had to.
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

/* -------------------------------------------------------------------------- */

test.describe("The title is a room with a menu on it", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "narrow", width: 390, height: 844 },
  ]) {
    test(`puts no text on top of other text at ${viewport.name}`, async ({
      page,
    }) => {
      // The environment-description line is gone (Task A), so there is no longer
      // a second block of text that can print over the title at all. What is
      // still checkable — and was part of the same finding — is that the title
      // heading is on screen and the page never scrolls sideways.
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await freshBrowser(page);
      await expect(page.getByTestId("title-screen")).toBeVisible();

      const heading = await page
        .locator('[data-testid="title-screen"] h1')
        .boundingBox();
      expect(heading).not.toBeNull();
      // The empty-room caption must be gone, not merely moved.
      await expect(page.getByTestId("title-scene-description")).toHaveCount(0);

      // And the page itself does not scroll sideways at either width.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("leaves the room the larger part of a desktop frame, menu on the left", async ({
    page,
  }) => {
    // THE OVERSIZED MENU, and its side. The human saw a wide sheet over the
    // environment; the packet asks for a compact panel, and the post-#87 pass
    // (Task C/R) puts it on the LEFT so the open side of the room is kept.
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    const panel = await page.getByTestId("title-screen").boundingBox();
    expect(panel).not.toBeNull();
    expect(panel!.width / 1440).toBeLessThan(0.34);
    // Left-biased: its centre sits in the left-hand half of the frame.
    expect(panel!.x + panel!.width / 2).toBeLessThan(1440 / 2);

    // Five controls, all of them reachable from the keyboard.
    for (const control of [
      "new-game",
      "continue",
      "open-saves",
      "open-options",
      "quit",
    ]) {
      await expect(page.getByTestId(control)).toBeVisible();
    }
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("new-game")).toBeFocused();
  });

  test("changes room on the fifteen-second beat, and paints only released art", async ({
    page,
  }) => {
    // THE AMBIENT CYCLE, on a clock the test owns. Nothing here waits: the
    // page's one timer is driven forward and the screen is read after each
    // step, which is what makes "roughly fifteen seconds" checkable rather
    // than a thing somebody watched once.
    await page.clock.install();
    await freshBrowser(page);
    await expect(page.getByTestId("title-tableau")).toHaveAttribute(
      "data-has-plate",
      "true",
    );
    const stage = page.getByTestId("title-tableau-stage");
    const first = await stage.getAttribute("data-scene-id");
    expect(first).toBeTruthy();

    // Fourteen seconds is not fifteen.
    await page.clock.fastForward(14_000);
    expect(await stage.getAttribute("data-scene-id")).toBe(first);

    await page.clock.fastForward(2_000);
    const second = await stage.getAttribute("data-scene-id");
    expect(second, "the room did not change on the beat").not.toBe(first);
    // The room it replaced is painted underneath while it goes.
    await expect(page.getByTestId("title-tableau-stage-leaving")).toHaveCount(
      1,
    );

    // Whatever it lands on is a released plate that actually decoded.
    const plate = page.getByTestId("title-tableau-plate").first();
    await expect
      .poll(async () =>
        plate.evaluate(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth,
        ),
      )
      .toBeGreaterThan(0);
  });

  test("crossfades one room into the next without a white wash", async ({
    page,
  }) => {
    // THE FLASH. The transition read as a white camera flash because both rooms
    // faded through the pale page at once (Task B). The fix is a true
    // image-to-image crossfade: the outgoing room holds at full opacity beneath
    // the incoming one, so at every instant an opaque room covers the screen.
    await page.clock.install();
    await freshBrowser(page);
    await expect(page.getByTestId("title-tableau")).toHaveAttribute(
      "data-has-plate",
      "true",
    );

    // Cross the fifteen-second beat so a room is arriving over the one it
    // replaces.
    await page.clock.fastForward(15_500);

    const leaving = page.getByTestId("title-tableau-stage-leaving");
    await expect(leaving).toHaveCount(1);

    // The crux: the outgoing room is fully opaque, not fading to transparent —
    // so the page behind it (and the white it would flash) can never show.
    const leavingOpacity = await leaving.evaluate((node) =>
      Number(getComputedStyle(node as Element).opacity),
    );
    expect(leavingOpacity).toBe(1);

    // And two real, decoded plates overlap during the transition rather than
    // both vanishing behind a wash.
    const decodedPlates = await page
      .getByTestId("title-tableau-plate")
      .evaluateAll(
        (images) =>
          images.filter(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ).length,
      );
    expect(decodedPlates).toBeGreaterThanOrEqual(2);
  });

  test("consumes no world and no randomness while it drifts", async ({
    page,
  }) => {
    // The cycle is presentation, and the proof is that leaving the title
    // running changes nothing about the game that follows. A replay address
    // pins the whole setup, seed included, so the same address is the same
    // world — unless something between the two visits consumed the randomness
    // the world is built from, which is exactly what a drifting backdrop must
    // never do.
    await page.clock.install();
    await freshBrowser(page);
    await fillCreator(page, { age: 30 });
    await page.getByTestId("setup-advanced").click();
    const replay = (
      (await page.getByTestId("setup-replay-link").textContent()) ?? ""
    ).trim();
    expect(replay).toContain("replay=");

    await page.goto(replay);
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await page.getByTestId("introduction-continue").click();
    const immediately = await page.getByTestId("story-who").innerText();

    await freshBrowser(page);
    await page.clock.fastForward(120_000);
    // Two minutes of drifting, and still nothing saved.
    await expect(page.getByTestId("continue")).toBeDisabled();
    await expect(page.getByTestId("open-saves")).toBeDisabled();

    await page.goto(replay);
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await page.getByTestId("introduction-continue").click();
    expect(await page.getByTestId("story-who").innerText()).toBe(immediately);
  });

  test("holds still for a viewer who asked for less motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await freshBrowser(page);
    await expect(page.getByTestId("title-tableau")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
    // The drift class is withheld, and the room is still there.
    const stage = page.getByTestId("title-tableau-stage");
    await expect(stage).toHaveAttribute("data-drifting", "false");
    await expect(page.getByTestId("title-tableau-plate")).toBeVisible();
    await context.close();
  });
});

/* -------------------------------------------------------------------------- */

test.describe("The creator stands in the same world", () => {
  test("keeps the room behind New Game and behind the calibration", async ({
    page,
  }) => {
    // "New Game breaks to a blank standalone form" was the finding. The room
    // is the answer, and it has to survive both screens.
    await freshBrowser(page);
    await openCreator(page);
    await expect(page.getByTestId("title-tableau")).toHaveAttribute(
      "data-has-plate",
      "true",
    );
    await expect(page.getByTestId("setup-screen")).toBeVisible();

    await freshBrowser(page);
    await fillCreator(page, { age: 30, calibration: "short" });
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
    await expect(page.getByTestId("title-tableau")).toHaveAttribute(
      "data-has-plate",
      "true",
    );
  });

  test("offers a normal start and a custom start, and they build differently", async ({
    page,
  }) => {
    // The two routes, as the packet defines them: a normal start lets the
    // calibration lean the household the generator writes, and a custom start
    // does not. Same seed, same answers, one difference.
    await freshBrowser(page);
    await openCreator(page);
    await expect(page.getByTestId("start-normal")).toBeVisible();
    await expect(page.getByTestId("start-custom")).toBeVisible();

    const seedFor = async (route: "normal" | "custom") => {
      await freshBrowser(page);
      await fillCreator(page, { age: 30, route, calibration: "skipped" });
      await page.getByTestId("setup-advanced").click();
      return (
        (await page.getByTestId("setup-replay-link").textContent()) ?? ""
      ).trim();
    };
    const normal = await seedFor("normal");
    const custom = await seedFor("custom");
    expect(normal).toContain("replay=");
    expect(custom).toContain("replay=");
    // The route travels in the address, so a replay of a custom start is a
    // custom start.
    expect(custom).not.toBe(normal);
  });
});

/* -------------------------------------------------------------------------- */

test.describe("A life happens in the room the records put it in", () => {
  test("introduces the generated household before the first beat", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 10, childhood: true });

    const introduction = page.getByTestId("life-introduction");
    await expect(introduction).toBeVisible();
    const said = await introduction.innerText();
    // Everybody named is named with what the record says they are, which is
    // the whole difference between this and "Maya Pittman is in the house".
    expect(said).toMatch(/your (mom|dad|parent|older|younger)/i);
    expect(said).not.toMatch(
      /tableau|asset|tier|registry|raster|seed|household id/i,
    );

    // And nothing else is on screen until it has been read.
    await expect(page.getByTestId("story-section")).toHaveCount(0);
    await expect(page.getByTestId("life-elsewhere")).toHaveCount(0);
  });

  test("opens the life in a released home, with one moment in front", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 36 });
    await page.getByTestId("introduction-continue").click();

    // THE ROOM. A canonical household resolves to a released domestic plate,
    // and the plate actually decodes.
    const backdrop = page.getByTestId("scene-backdrop");
    await expect(backdrop).toHaveAttribute("data-has-plate", "true");
    await expect(backdrop).toHaveAttribute(
      "data-scene-id",
      /residence-apartment-living/,
    );
    const plate = page.getByTestId("scene-backdrop-plate");
    await expect
      .poll(async () =>
        plate.evaluate(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth,
        ),
      )
      .toBeGreaterThan(0);

    // THE HIERARCHY. One moment, and everything else behind a control.
    await expect(page.getByTestId("story-section")).toBeVisible();
    await expect(page.getByTestId("ordinary-section")).toHaveCount(0);
    await expect(page.getByTestId("office-section")).toHaveCount(0);
    await expect(page.getByTestId("conversations")).toHaveCount(0);

    // The secondary systems live on the corner HUD now, not stacked under the
    // moment. Opening People shows the conversations over the room; closing it
    // puts them away, so the wall cannot rebuild itself.
    await expect(page.getByTestId("life-hud")).toBeVisible();
    await page.getByTestId("elsewhere-people").click();
    await expect(page.getByTestId("conversations")).toBeVisible();
    await page.getByTestId("elsewhere-people").click();
    await expect(page.getByTestId("conversations")).toHaveCount(0);
  });

  test("comes back to the same room and the same moment after a reload", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 36 });
    await page.getByTestId("introduction-continue").click();
    const room = await page
      .getByTestId("scene-backdrop")
      .getAttribute("data-scene-id");
    const moment = await page.getByTestId("story-who").innerText();

    await page.getByTestId("keep-world").click();
    await expect(page.getByTestId("keep-world")).toHaveCount(0);
    await page.reload();
    await page.getByTestId("continue").click();

    // A saved life has been introduced already, so it opens on its moment.
    await expect(page.getByTestId("life-introduction")).toHaveCount(0);
    await expect(page.getByTestId("story-who")).toHaveText(moment);
    await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
      "data-scene-id",
      room ?? "",
    );
  });
});
