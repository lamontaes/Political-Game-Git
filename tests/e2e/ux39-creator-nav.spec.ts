import { expect, test, type Page } from "./fixtures";
import {
  enterLife,
  finishAppearance,
  goTo,
  openCreator,
  saveLife,
} from "./support/creator";

test.describe.configure({ timeout: 180_000 });

async function freshBrowser(page: Page) {
  await page.goto("/?seed=ux39-creator-nav");
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

test("UX39 creator, calendar grid, People Web, then inspect/save/reopen without spending time", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await freshBrowser(page);
  await expect(page.getByTestId("new-game")).toHaveText("New life");
  await page.screenshot({
    path: testInfo.outputPath("ux39-title-viewport.png"),
    fullPage: false,
  });

  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await page.getByTestId("start-age").fill("34");
  await page.getByTestId("randomize-given-name").click();
  await expect(page.getByTestId("creator-given-name")).not.toHaveValue("");
  await page.getByTestId("randomize-family-name").click();
  await expect(page.getByTestId("creator-family-name")).not.toHaveValue("");
  await page.getByTestId("start-birth-month").selectOption("4");
  await page.getByTestId("start-birth-day").selectOption("12");
  await page.screenshot({
    path: testInfo.outputPath("ux39-creator-character.png"),
    fullPage: false,
  });
  await page.getByTestId("creator-continue-character").click();

  await page.getByTestId("state-search").fill("Nevada");
  await page.getByTestId("state-NV").click();
  await expect(page.getByTestId("place-page-status")).toBeVisible();
  await expect(page.getByTestId("place-page-status")).not.toHaveText(
    /every town in the country/i,
  );
  await page.getByTestId("creator-change-state").click();
  await page.getByTestId("state-search").fill("Kentucky");
  await page.getByTestId("state-KY").click();
  await page.getByTestId("place-search").fill("lex");
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: /Lexington, Kentucky/i })
    .click();
  await page.getByTestId("creator-continue-place").click();
  await page.getByTestId("whoareyou-play").click();
  await expect(page.getByTestId("creator-stage-appearance")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("ux39-creator-appearance.png"),
    fullPage: false,
  });
  await finishAppearance(page);
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
  await expect(page.getByTestId("story-section")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("ux39-quiet-scene.png"),
    fullPage: false,
  });

  await goTo(page, "nav-calendar");
  await expect(page.getByTestId("calendar-grid")).toBeVisible();
  const clock = page.getByTestId("calendar-today");
  const isoDate = await clock.getAttribute("data-iso-date");
  const timeLabel = (await clock.innerText()).split(" · ")[1];
  await page.getByTestId("calendar-view-week").click();
  await expect(page.getByTestId("calendar-grid")).toHaveAttribute(
    "data-mode",
    "week",
  );
  await page.screenshot({
    path: testInfo.outputPath("ux39-calendar-week.png"),
    fullPage: false,
  });
  await page.getByTestId("calendar-workspace-close").click();

  await goTo(page, "elsewhere-people");
  await expect(page.getByTestId("people-relationship-web")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("ux39-people-web.png"),
    fullPage: false,
  });
  await page.getByTestId("people-overlay-close").click();

  await goTo(page, "nav-options");
  await page.getByTestId("option-date-order-dmy").click();
  await page.getByTestId("options-workspace-close").click();

  await goTo(page, "nav-calendar");
  await expect(clock).toHaveAttribute("data-iso-date", isoDate ?? "");
  expect((await clock.innerText()).split(" · ")[1]).toBe(timeLabel);
  await page.getByTestId("calendar-workspace-close").click();

  await saveLife(page);
  await goTo(page, "leave-game");
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-calendar");
  await expect(clock).toHaveAttribute("data-iso-date", isoDate ?? "");
  expect((await clock.innerText()).split(" · ")[1]).toBe(timeLabel);
  await page.screenshot({
    path: testInfo.outputPath("ux39-reopen-calendar.png"),
    fullPage: false,
  });
});
