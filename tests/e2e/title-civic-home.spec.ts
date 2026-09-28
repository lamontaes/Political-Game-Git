import { expect, test, type Page } from "./fixtures";
import {
  enterLife,
  expectNoDestination,
  goTo,
  leaveGame,
  startLife as walkCreator,
} from "./support/creator";

/**
 * The home screen, Sept. 28.
 *
 * Lamontae: "no other images seem to be wired on the homescreen. and it needs
 * to stop defaulting to the apartment when there is a saved game. also, saved
 * games, options, etc need to stay on the home screen while it keeps
 * changing."
 *
 * So, in a real browser at the two desktop sizes the owner plays at: the
 * pictures are the places of government and they change every fifteen
 * seconds; the menu stays on screen, fully opaque and clickable through two
 * changes; Saved games opens beside the menu while the pictures keep changing;
 * and a saved life opens on a civic place, never a home.
 */

const MENU = ["new-game", "continue", "open-saves", "open-options", "quit"];
const HOME =
  /residence|apartment|rowhouse|farmhouse|mobile-home|suburban-house|large-house/;

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

/** Every menu control is on screen, opaque, and the top thing at its center. */
async function expectMenuUsable(page: Page) {
  const viewport = page.viewportSize()!;
  for (const control of MENU) {
    const button = page.getByTestId(control);
    await expect(button, control).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.x, control).toBeGreaterThanOrEqual(0);
    expect(box.y, control).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, control).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, control).toBeLessThanOrEqual(viewport.height);
    const report = await button.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      const hit = document.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      );
      let opacity = 1;
      for (
        let element: Element | null = node;
        element;
        element = element.parentElement
      )
        opacity *= Number(getComputedStyle(element).opacity);
      return { onTop: hit === node || node.contains(hit), opacity };
    });
    expect(report.onTop, `${control} is covered`).toBe(true);
    expect(report.opacity, `${control} fades`).toBe(1);
  }
}

async function startAndKeepALife(page: Page) {
  await walkCreator(page, { place: "Lexington", state: "Kentucky", age: 40 });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
  await goTo(page, "keep-world");
  await expectNoDestination(page, "keep-world");
  await leaveGame(page);
  await expect(page.getByTestId("title-screen")).toBeVisible();
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1440, height: 1000 },
]) {
  test.describe(`The home screen at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("keeps the menu usable across two picture changes", async ({
      page,
    }) => {
      await page.clock.install({ time: new Date("2026-09-28T17:00:00Z") });
      await freshBrowser(page);
      const stage = page.getByTestId("title-tableau-stage");
      await expect(stage).toHaveAttribute("data-civic-kind", "white-house");
      await expectMenuUsable(page);

      const seen = [await stage.getAttribute("data-scene-id")];
      for (let change = 0; change < 2; change += 1) {
        await page.clock.fastForward(15_500);
        // Mid-crossfade: the old picture is still underneath.
        await expect(
          page.getByTestId("title-tableau-stage-leaving"),
        ).toHaveCount(1);
        await expectMenuUsable(page);
        const now = await stage.getAttribute("data-scene-id");
        expect(now, "the picture did not change").not.toBe(seen.at(-1));
        seen.push(now);
        await expect(stage).toHaveAttribute("data-civic-kind", /.+/);
        expect(now ?? "").not.toMatch(HOME);
        // And after the crossfade.
        await page.clock.fastForward(2_000);
        await expectMenuUsable(page);
      }
      // The version stamp stays in its corner.
      const version = page.locator(".pg-version").first();
      await expect(version).toBeVisible();
      const box = (await version.boundingBox())!;
      expect(box.x + box.width).toBeGreaterThan(viewport.width * 0.8);
      expect(box.y + box.height).toBeGreaterThan(viewport.height * 0.9);
    });

    test("opens Saved games and Options beside the menu while the pictures change", async ({
      page,
    }) => {
      await page.clock.install({ time: new Date("2026-09-28T17:00:00Z") });
      await freshBrowser(page);
      await page.getByTestId("open-saves").click();
      await expect(page.getByTestId("saves-screen")).toBeVisible();
      await expectMenuUsable(page);
      const stage = page.getByTestId("title-tableau-stage");
      const before = await stage.getAttribute("data-scene-id");
      await page.clock.fastForward(15_500);
      await expect(stage).not.toHaveAttribute("data-scene-id", before ?? "");
      await expect(page.getByTestId("saves-screen")).toBeVisible();
      await expectMenuUsable(page);

      // The menu switches the panel without leaving the home screen.
      await page.getByTestId("open-options").click();
      await expect(page.getByTestId("options-screen")).toBeVisible();
      await expect(page.getByTestId("saves-screen")).toHaveCount(0);
      await expectMenuUsable(page);
      await page.getByRole("button", { name: "Back" }).click();
      await expect(page.getByTestId("title-side-panel")).toHaveCount(0);
      await expectMenuUsable(page);
    });

    test("opens a saved life on a civic place, never at home", async ({
      page,
    }) => {
      await freshBrowser(page);
      await startAndKeepALife(page);
      await page.clock.install({ time: new Date("2026-09-28T17:00:00Z") });
      await page.reload();
      await expect(page.getByTestId("continue")).toBeEnabled();

      const stage = page.getByTestId("title-tableau-stage");
      await expect(stage).toHaveAttribute("data-civic-kind", /.+/);
      const first = (await stage.getAttribute("data-scene-id")) ?? "";
      expect(first).toMatch(/^picture:/);
      expect(first).not.toMatch(HOME);
      await expect(
        page.getByTestId("title-tableau-plate").first(),
      ).not.toHaveAttribute("src", HOME);
      await expectMenuUsable(page);

      // The same place leads after a change of picture and a return: it is
      // the save's own, not whichever came up first.
      await page.clock.fastForward(15_500);
      await expect(stage).not.toHaveAttribute("data-scene-id", first);
      await expectMenuUsable(page);
      await page.reload();
      await expect(stage).toHaveAttribute("data-scene-id", first);
    });
  });
}
