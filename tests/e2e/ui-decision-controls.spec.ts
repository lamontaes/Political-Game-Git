import { expect, test, type Locator, type Page } from "./fixtures";

import { chooseOption, expectChosen } from "./support/controls";
import {
  chooseStartAge,
  enterLife,
  goTo,
  openCreator,
  openNewsContext,
  startLife,
  answerCharacterBasics,
} from "./support/creator";

/*
 * UI DECISION FOLLOW-THROUGH, section A: no stock in-game controls. The
 * creator's character step and the News, Journal and Politics screens use
 * the game's own select, whose OPEN state is the game's list, not the
 * operating system's menu. Checked by pointer and keyboard at the three
 * review sizes (Chromium; WebKit is not installed in this environment).
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

async function expectNoStockControls(scope: Locator): Promise<void> {
  await expect(scope.locator("select")).toHaveCount(0);
  await expect(
    scope.locator('input[type="date"], input[type="color"]'),
  ).toHaveCount(0);
}

async function listInsideViewport(page: Page, control: Locator) {
  const listId = await control.getAttribute("aria-controls");
  const list = page.locator(`[id="${listId}"]`);
  await expect(list).toBeVisible();
  const box = (await list.boundingBox())!;
  const size = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
  const colors = await list.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
  // The game's dark list, never a white system menu.
  expect(colors.background).not.toMatch(/^rgba?\(255, 255, 255/);
  return list;
}

for (const size of SIZES) {
  test(`creator uses the game's controls, open and closed, at ${size.name}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await freshBrowser(page);
    await openCreator(page);
    await page.getByTestId("start-normal").click();
    const stage = page.getByTestId("creator-stage-character");
    await expect(stage).toBeVisible();
    await expectNoStockControls(stage);

    // Gender, then name, then the whole birthday: the accepted order.
    const order = await stage.evaluate((element) => {
      const find = (selector: string) =>
        element.querySelector(selector)!.getBoundingClientRect().top;
      return [
        find('[data-testid="gender-choices"]'),
        find('[data-testid="creator-randomize-name"]'),
        find('[data-testid="creator-birthday"]'),
      ];
    });
    expect(order[0]).toBeLessThan(order[1]!);
    expect(order[1]).toBeLessThan(order[2]!);

    // Keyboard: open with Enter, move, choose with Enter, focus stays.
    const month = page.getByTestId("start-birth-month");
    await month.focus();
    await page.keyboard.press("Enter");
    await expect(month).toHaveAttribute("aria-expanded", "true");
    const list = await listInsideViewport(page, month);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.screenshot({ path: info.outputPath("31-month-open.png") });
    await page.keyboard.press("Enter");
    await expect(list).toHaveCount(0);
    await expectChosen(month, "3");
    await expect(month).toBeFocused();

    // Typeahead while closed, and Escape closes without changing anything.
    await page.keyboard.type("jul");
    await expectChosen(month, "7");
    await page.keyboard.press("Alt+ArrowDown");
    await expect(month).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(month).toHaveAttribute("aria-expanded", "false");
    await expectChosen(month, "7");
    await expect(month).toBeFocused();
    await expect(stage).toBeVisible();

    // Pointer: the day list is no longer than the month; outside click closes.
    const day = page.getByTestId("start-birth-day");
    await day.click();
    const days = await listInsideViewport(page, day);
    await expect(days.locator('[role="option"]')).toHaveCount(32);
    await page.getByRole("heading", { name: "Your character" }).click();
    await expect(days).toHaveCount(0);
    await chooseOption(day, "14");

    // The year sets the age, shown rather than typed.
    await expect(page.getByTestId("creator-continue-character")).toBeDisabled();
    const year = page.getByTestId("start-birth-year");
    await year.click();
    await listInsideViewport(page, year);
    await page.screenshot({ path: info.outputPath("32-year-open.png") });
    await year.press("Escape");
    await chooseStartAge(page, 30);
    await expectChosen(year, "1995");
    await expect(page.getByTestId("creator-derived-age")).toContainText(
      "You begin at age 30, on January 5, 2026.",
    );
    await page.getByTestId("creator-randomize-birthday").click();
    await expect(page.getByTestId("creator-derived-age")).toContainText(
      "You begin at age",
    );
    // Gender and name are required too (CRUNCH46 R7).
    await answerCharacterBasics(page);
    await expect(page.getByTestId("creator-continue-character")).toBeEnabled();
  });

  test(`News, Journal and Politics use the game's controls at ${size.name}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await freshBrowser(page);
    await startLife(page, {
      route: "custom",
      state: "Nevada",
      place: "Alamo",
      age: 34,
      household: "shares-a-home",
    });
    await enterLife(page);

    await goTo(page, "nav-journal-entry");
    await page.getByTestId("journal-view-years").click();
    const yearFilter = page.getByTestId("journal-year");
    await expectNoStockControls(page.locator("main").first());
    await yearFilter.click();
    await listInsideViewport(page, yearFilter);
    await page.screenshot({
      path: info.outputPath("33-journal-year-open.png"),
    });
    await yearFilter.press("Escape");
    await expect(yearFilter).toBeFocused();

    await goTo(page, "nav-news");
    await expectNoStockControls(page.getByTestId("news-desk"));
    await openNewsContext(page, "press");
    await expectNoStockControls(page.getByTestId("news-desk"));
    await page.screenshot({ path: info.outputPath("34-news-press.png") });

    await goTo(page, "nav-municipal");
    const government = page.getByTestId("municipal-government-select");
    await expectNoStockControls(page.getByTestId("municipal-workspace"));
    if (await government.isEnabled()) {
      await government.click();
      await listInsideViewport(page, government);
      await page.screenshot({
        path: info.outputPath("35-local-government-open.png"),
      });
      await government.press("Escape");
    }
  });
}
