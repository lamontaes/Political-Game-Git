import { expect, test, type Page } from "./fixtures";

import {
  enterLife,
  goTo,
  openElsewhere,
  saveLife,
  startLife,
} from "./support/creator";
import { chooseOption, expectChosen, optionValues } from "./support/controls";

/*
 * UI DECISION FOLLOW-THROUGH, increment 2: News front pages, Journal views,
 * proposal Compare / Read and the saved reading choices, at the three review
 * sizes, by pointer and keyboard, through a save and a reopen.
 */

test.describe.configure({ timeout: 300_000 });

const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
] as const;

async function freshBrowser(page: Page, query = ""): Promise<void> {
  await page.goto(`/?art-preview=candidate${query}`);
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

async function reopen(page: Page): Promise<void> {
  await saveLife(page);
  await page.goto("/?art-preview=candidate");
  await page.getByTestId("continue").click();
  await enterLife(page);
}

for (const size of SIZES) {
  test(`News, Journal and the person card for a citizen at ${size.name}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
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
    const day = await shellDate(page);

    // Somebody at home gets the card beside them, inside the window.
    const scenePerson = page.locator('[data-testid^="scene-person-"]').first();
    await expect(scenePerson).toBeVisible();
    await scenePerson.click();
    const card = page.getByTestId("quick-dossier");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-placement", /^anchored-/);
    await inViewport(page, "quick-dossier");
    await page.screenshot({ path: info.outputPath("11-anchored-card.png") });
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);

    // News opens on the mixed front page and nothing else.
    await goTo(page, "nav-news");
    const front = page.getByTestId("news-front-page");
    await expect(front).toBeVisible();
    await expect(page.getByTestId("news-section-read")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("news-mode-front")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("news-masthead")).toBeVisible();
    await expect(page.getByTestId("world39-news")).toHaveCount(0);
    await expect(page.getByTestId("public-information-panel")).toHaveCount(0);
    await expect(page.getByTestId("press-request-form")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("12-news-front.png") });

    const onePaper = page.getByTestId("news-mode-publication");
    if (await onePaper.isEnabled()) {
      await onePaper.focus();
      await page.keyboard.press("Enter");
      await expect(onePaper).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("news-paper-select")).toBeVisible();
    } else {
      await expect(page.getByTestId("news-empty")).toHaveText(
        "Nothing has been published yet.",
      );
    }

    // Each other context is its own view, and Back returns to the paper.
    const around = page.getByTestId("news-section-around");
    await around.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("world39-news")).toBeVisible();
    await expect(front).toHaveCount(0);
    await page.getByTestId("news-section-directory").click();
    await expect(page.getByTestId("public-information-panel")).toBeVisible();
    await expect(page.getByTestId("world39-news")).toHaveCount(0);
    await page.getByTestId("news-section-press").click();
    await expect(page.getByTestId("press-request-form")).toBeVisible();
    await expect(page.getByTestId("public-information-panel")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("13-news-press.png") });
    await page.getByTestId("news-section-read").click();
    await expect(front).toBeVisible();

    // Journal: Chapters by default, Years and a year by choice.
    await goTo(page, "nav-journal-entry");
    await expect(page.getByTestId("journal-view-chapters")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const years = page.getByTestId("journal-view-years");
    await years.focus();
    await page.keyboard.press("Space");
    await expect(years).toHaveAttribute("aria-pressed", "true");
    const yearSelect = page.getByTestId("journal-year");
    const chosenYear = (await optionValues(yearSelect)).at(-1);
    expect(chosenYear).toMatch(/^\d{4}$/);
    await chooseOption(yearSelect, chosenYear!);
    for (const chapter of await page.getByTestId("world39-chapter").all()) {
      await expect(chapter).toHaveAttribute("data-year", chosenYear!);
    }
    await page.screenshot({ path: info.outputPath("14-journal-years.png") });

    // Reading moved nothing, and the choices survive a reopen.
    expect(await shellDate(page)).toBe(day);
    await reopen(page);
    await goTo(page, "nav-journal-entry");
    await expect(page.getByTestId("journal-view-years")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expectChosen(page.getByTestId("journal-year"), chosenYear!);
    await goTo(page, "nav-news");
    const expectedMode = (await page
      .getByTestId("news-mode-publication")
      .isEnabled())
      ? "news-mode-publication"
      : "news-mode-front";
    await expect(page.getByTestId(expectedMode)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await shellDate(page)).toBe(day);
    await expect(page.getByTestId("lie-marker")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`proposal Compare and Read for a recorded member at ${size.name}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: size.width, height: size.height });
    await freshBrowser(page);
    // A recorded House member from the creator's office start.
    await startLife(page, {
      route: "custom",
      state: "Kentucky",
      place: "Kentucky",
      age: 34,
      office: true,
      household: "shares-a-home",
    });
    await enterLife(page);
    await openElsewhere(page, "work");
    await expect(page.getByTestId("docket")).toBeVisible();

    await page.getByTestId("open-drafting-table").click();
    await page
      .getByTestId("drafting-option-bridge-maintenance-worst-first-condition")
      .click();
    const layout = page.getByTestId("drafting-layout");
    const wide = size.width > 900;
    await expect(layout).toHaveAttribute("data-layout", "auto");
    await expect(layout).toHaveAttribute(
      "data-shown",
      wide ? "compare" : "read",
    );

    // An unsaved change, then Read and Compare by keyboard: it stays.
    const threshold = page.getByTestId("draft-param-condition-threshold");
    await threshold.focus();
    await threshold.press("End");
    const read = page.getByTestId("drafting-layout-read");
    await read.focus();
    await page.keyboard.press("Enter");
    const reading = page.getByTestId("drafting-layout-reading");
    await expect(reading).toContainText("condition rating of 6 or below");
    await expect(
      reading.locator('[data-changed="true"]').first(),
    ).toBeVisible();
    await reading.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath("21-proposal-read.png") });

    await page.getByTestId("drafting-layout-compare").click();
    const compare = page.getByTestId("drafting-compare");
    await expect(compare).toContainText("condition rating of 6 or below");
    await expect(
      page.getByTestId("drafting-row-eligible-structures"),
    ).toHaveClass(/drafting-row-changed/);
    await compare.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath("22-proposal-compare.png") });

    // Leave it on Read; the choice comes back after a reopen.
    await read.click();
    await reopen(page);
    await openElsewhere(page, "work");
    await page.getByTestId("open-drafting-table").click();
    await page
      .getByTestId("drafting-option-bridge-maintenance-worst-first-condition")
      .click();
    await expect(page.getByTestId("drafting-layout-read")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("drafting-layout-reading")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
