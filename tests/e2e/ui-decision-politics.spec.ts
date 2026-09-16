import { expect, test, type Page } from "./fixtures";

import { openShellMenu, startLife } from "./support/creator";

/*
 * UI DECISION FOLLOW-THROUGH, increment 1: the Politics hub, its Government
 * browser and the contextual person card, on a non-Kentucky life, at the three
 * review sizes. Controls are used with the pointer and the keyboard; browsing
 * must not move the World's clock.
 */

test.describe.configure({ timeout: 180_000 });

const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
] as const;

async function freshBrowser(page: Page): Promise<void> {
  await page.goto("/?art-preview=candidate");
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

async function shellDate(page: Page): Promise<string> {
  const label =
    (await page.getByTestId("shell-nav-cluster").getAttribute("aria-label")) ??
    "";
  const match = /([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(label);
  expect(match, `no date in "${label}"`).not.toBeNull();
  return match![1]!;
}

async function inViewport(page: Page, testid: string): Promise<void> {
  const box = await page.getByTestId(testid).boundingBox();
  const size = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1);
}

for (const size of SIZES) {
  test(`Politics hub, government and person card at ${size.name}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: size.width, height: size.height });
    await freshBrowser(page);
    await startLife(page, {
      state: "Nevada",
      place: "Alamo",
      age: 34,
      calibration: "skipped",
    });
    await expect(page.getByTestId("play-screen")).toBeVisible();
    const day = await shellDate(page);

    // A person clicked in the room gets the card beside them.
    const scenePerson = page.locator('[data-testid^="scene-person-"]').first();
    if ((await scenePerson.count()) > 0) {
      await scenePerson.click();
      const card = page.getByTestId("quick-dossier");
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("data-placement", /^anchored-/);
      await inViewport(page, "quick-dossier");
      await page.screenshot({ path: info.outputPath("01-anchored-card.png") });
      await page.keyboard.press("Escape");
      await expect(card).toHaveCount(0);
    }

    // Politics → Government, by pointer.
    await openShellMenu(page);
    await page.getByTestId("nav-group-politics").click();
    await page.getByTestId("nav-politics-government").click();
    const browser = page.getByTestId("government-browser");
    await expect(browser).toBeVisible();
    await expect(page.getByTestId("politics-tabs")).toBeVisible();
    await expect(page.getByTestId("politics-tab-government")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("government-place")).toContainText("Here");
    await expect(page.getByTestId("government-place")).toContainText("Alamo");
    for (const branch of ["legislative", "executive", "judicial"]) {
      await expect(
        page.getByTestId(`government-branch-${branch}`),
      ).toBeVisible();
    }
    await expect(browser).not.toContainText(/vacan/i);
    await page.screenshot({ path: info.outputPath("02-government-local.png") });

    // Scope by keyboard.
    const state = page.getByTestId("government-scope-state");
    await state.focus();
    await page.keyboard.press("Enter");
    await expect(state).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("government-governs")).toContainText(
      "Nevada",
    );
    const federal = page.getByTestId("government-scope-federal");
    await federal.focus();
    await page.keyboard.press("Space");
    await expect(federal).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("government-governs")).toContainText(
      "United States",
    );
    await page.screenshot({
      path: info.outputPath("03-government-federal.png"),
    });

    // A holder opens the one card in the consistent side placement.
    const holder = page.locator('[data-testid^="government-holder-"]').first();
    if ((await holder.count()) > 0) {
      await holder.click();
      const card = page.getByTestId("quick-dossier");
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("data-placement", "side");
      await inViewport(page, "quick-dossier");
      await page.screenshot({ path: info.outputPath("04-holder-card.png") });
      await page.keyboard.press("Escape");
    }

    // The hub reaches every existing political surface.
    await page.getByTestId("politics-tab-issues").click();
    await expect(page.getByTestId("politics-workspace")).toBeVisible();
    await page.getByTestId("politics-sub-transit").click();
    await expect(page.getByTestId("transit-workspace")).toBeVisible();
    await page.getByTestId("politics-sub-tax").click();
    await expect(page.getByTestId("tax-workspace")).toBeVisible();
    await page.getByTestId("politics-tab-campaigns").click();
    await expect(page.getByTestId("candidacy-workspace")).toBeVisible();
    await page.getByTestId("politics-tab-parties").click();
    await expect(page.getByTestId("parties-workspace")).toBeVisible();
    await page.getByTestId("politics-tab-government").click();
    await page.getByTestId("politics-sub-records").click();
    await expect(page.getByTestId("municipal-workspace")).toBeVisible();
    await page.screenshot({ path: info.outputPath("05-local-records.png") });

    // Looking changed nothing.
    expect(await shellDate(page)).toBe(day);
    expect(errors).toEqual([]);
  });
}
