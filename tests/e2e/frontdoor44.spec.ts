import { expect, test, type Page } from "./fixtures";
import { enterLife, goTo, startLife } from "./support/creator";

const RETIRED_PATH = /title_bg_civic_community_meeting_hero_slot/i;
const RETIRED_SCENE = "civic-community-meeting-title";

async function freshBrowser(page: Page): Promise<void> {
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

async function currentBackdrop(page: Page): Promise<{
  readonly sceneId: string;
  readonly source: string;
}> {
  const stage = page.getByTestId("title-tableau-stage");
  const plate = stage.getByTestId("title-tableau-plate");
  await expect(stage).toBeVisible();
  await expect
    .poll(async () =>
      plate.evaluate(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth,
      ),
    )
    .toBeGreaterThan(0);
  const sceneId = (await stage.getAttribute("data-scene-id")) ?? "";
  const source = (await plate.getAttribute("src")) ?? "";
  expect(sceneId).not.toBe(RETIRED_SCENE);
  expect(source).not.toMatch(RETIRED_PATH);
  for (const visiblePlate of await page
    .getByTestId("title-tableau-plate")
    .all()) {
    await expect(visiblePlate).not.toHaveAttribute("src", RETIRED_PATH);
  }
  return { sceneId, source };
}

test.describe("FRONTDOOR44 retirement", () => {
  for (const viewport of [
    { name: "1440x900", width: 1440, height: 900 },
    { name: "1200x720", width: 1200, height: 720 },
    { name: "1024x768", width: 1024, height: 768 },
  ]) {
    test(`holds the accepted backdrop through creator and Back at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      if (viewport.width === 1024) {
        await page.emulateMedia({ reducedMotion: "reduce" });
      }
      await freshBrowser(page);

      const titleBackdrop = await currentBackdrop(page);
      await page.screenshot({
        path: test.info().outputPath(`fresh-title-${viewport.name}.png`),
        fullPage: true,
      });

      if (viewport.width === 1200) {
        await page.keyboard.press("Tab");
        await expect(page.getByTestId("new-game")).toBeFocused();
        await page.keyboard.press("Enter");
      } else {
        await page.getByTestId("new-game").click();
      }
      const creator = page.getByTestId("setup-screen");
      await expect(creator).toBeVisible();
      await expect(creator.getByRole("heading", { level: 1 })).toHaveCount(0);
      await expect(
        creator.getByRole("heading", {
          level: 2,
          name: "How do you want to start?",
        }),
      ).toBeVisible();
      expect(await currentBackdrop(page)).toEqual(titleBackdrop);
      await page.screenshot({
        path: test.info().outputPath(`creator-${viewport.name}.png`),
        fullPage: true,
      });

      await creator.getByRole("button", { name: "Back", exact: true }).click();
      await expect(page.getByTestId("title-screen")).toBeVisible();
      expect(await currentBackdrop(page)).toEqual(titleBackdrop);
    });
  }

  test("keeps rotation, reload and a saved-life return clear of the retired room", async ({
    page,
  }) => {
    await page.clock.install();
    await freshBrowser(page);
    await currentBackdrop(page);
    for (let step = 0; step < 4; step += 1) {
      await page.clock.fastForward(15_100);
      await currentBackdrop(page);
    }

    await page.reload();
    await currentBackdrop(page);

    await startLife(page, {
      age: 34,
      state: "Kentucky",
      place: "Lexington",
      calibration: "skipped",
    });
    await enterLife(page);
    await goTo(page, "keep-world");
    await goTo(page, "leave-game");
    const confirmSavedReturn = page.getByRole("button", {
      name: "Quit without saving",
      exact: true,
    });
    if (await confirmSavedReturn.isVisible()) {
      await confirmSavedReturn.click();
    }
    await expect(page.getByTestId("title-screen")).toBeVisible();
    await currentBackdrop(page);
    await page.screenshot({
      path: test.info().outputPath("saved-life-title.png"),
      fullPage: true,
    });
  });
});
