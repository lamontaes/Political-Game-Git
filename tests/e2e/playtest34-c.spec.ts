import { expect, test, type Page } from "./fixtures";

import { goTo, startLife } from "./support/creator";

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
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function expectFullyInContentViewport(page: Page, testid: string) {
  const locator = page.getByTestId(testid);
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${testid} must have a box`).not.toBeNull();
  const viewport = await page.evaluate(() => ({
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  }));
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 2);
  expect(box!.width).toBeGreaterThan(24);
  expect(box!.height).toBeGreaterThan(24);
}

test.describe("PLAYTEST34 C quiet rest and primary controls", () => {
  test("title wordmark has no black slab", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    const heading = page.locator('[data-testid="title-screen"] h1');
    await expect(heading).toBeVisible();
    const background = await heading.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    expect(background).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/i);
  });

  test("Begin is a quiet room; pointer and keyboard reach Save", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await startLife(page, {
      place: "Lexington",
      state: "Kentucky",
      age: 22,
      household: "shares-a-home",
    });
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await expect(page.getByTestId("opening-life-panel")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Continue your life" }),
    ).toHaveCount(0);
    await expectFullyInContentViewport(page, "shell-nav-cluster");

    await page.getByTestId("shell-nav-cluster").click();
    await expect(page.getByTestId("shell-nav-flyout")).toBeVisible();
    const save = page.getByTestId("keep-world");
    await expect(save).toBeVisible();
    await expect(save).toHaveText(/Save/);
    await expectFullyInContentViewport(page, "keep-world");
    await save.click();
    await expect(page.getByTestId("keep-world")).toHaveCount(0);

    await page.keyboard.press("Escape");
    await page.getByTestId("shell-nav-cluster").focus();
    await expect(page.getByTestId("shell-nav-cluster")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("shell-nav-flyout")).toBeVisible();
  });

  test("People, Calendar, and Personal stay reachable at a short content height", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 560 });
    await freshBrowser(page);
    await startLife(page, {
      place: "Lexington",
      state: "Kentucky",
      age: 34,
      household: "shares-a-home",
    });
    await expectFullyInContentViewport(page, "shell-nav-cluster");

    await goTo(page, "nav-personal-group");
    await page.getByTestId("nav-personal").click();
    await expect(page.getByTestId("personal-workspace")).toBeVisible();
    await page.getByTestId("life-introduction").locator("summary").click();
    await expect(page.getByTestId("life-grounding")).toBeVisible();
    await page.getByTestId("personal-workspace-close").click();

    await goTo(page, "elsewhere-people");
    await expect(page.getByTestId("people-search")).toBeVisible();
    await expectFullyInContentViewport(page, "people-search");
    await expect(page.getByTestId("people-web-portraits")).toBeVisible();
    await page.getByTestId("people-view-list").click();
    await expect(page.getByTestId("people-list")).toBeVisible();
    await page.getByTestId("people-view-web").click();
    await expect(page.getByTestId("people-web-portraits")).toBeVisible();
    await page.getByTestId("people-search").fill("a");
    await page.getByTestId("people-overlay-close").click();

    await goTo(page, "nav-calendar");
    await expect(page.getByTestId("calendar-upcoming")).toBeVisible();
    await expect(page.getByTestId("calendar-simulate-day")).toBeVisible();
    await expectFullyInContentViewport(page, "calendar-simulate-day");
    await expect(page.getByTestId("calendar-simulate-week")).toBeVisible();
    const before = await page.getByTestId("calendar-today").innerText();
    await page.getByTestId("calendar-simulate-day").click();
    await expect(page.getByTestId("calendar-time-outcome")).toBeVisible();
    const after = await page.getByTestId("calendar-today").innerText();
    expect(after.length).toBeGreaterThan(0);
    expect(before.length).toBeGreaterThan(0);
  });
});
