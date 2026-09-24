import { expect, test, type Page } from "./fixtures";
import {
  enterLife,
  openMoment,
  startLife as walkCreator,
  waitForClockIdle,
} from "./support/creator";

/**
 * The shell Week control discloses its destination before one clock command.
 */

async function freshBrowser(page: Page) {
  // WebKit's first load of the dev server is slow; give it room.
  await page.goto("/", { timeout: 120_000 });
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

const TARGET_DATE = /Skip to [A-Z][a-z]+, ([A-Z][a-z]+ \d{1,2}, \d{4})/;

test("the shell week discloses its target and lands there once", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await freshBrowser(page);
  await page.goto("/?seed=governing-time-command");
  await walkCreator(page, { place: "Lexington", state: "Kentucky", age: 41 });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
  await openMoment(page);
  // The moment is the room's own panel, so this reads it where the player
  // sees it. It used to open Personal's "Your day" disclosure to reach it.
  const story = page.getByTestId("story-section");
  await expect(story).toBeVisible();
  for (let step = 0; step < 3; step += 1) {
    const target = page.locator("#pg-nav-week-target");
    await expect(target).toContainText(TARGET_DATE);
    const disclosed = ((await target.textContent()) ?? "").match(
      TARGET_DATE,
    )![1]!;
    const before = await story.getByTestId("moment-when").innerText();
    await page.getByTestId("shell-pass-week").click();
    // The clock's own idle signal, the way every other time proof waits. The
    // panel re-renders while the command is in flight, so "the text changed"
    // can be true of a frame the command has not finished writing.
    await waitForClockIdle(page);
    await expect(story.getByTestId("moment-when")).not.toHaveText(before);
    const after = await story.getByTestId("moment-when").innerText();
    const reached = Date.parse(after.split(" · ")[0]!);
    const before_ = Date.parse(before.split(" · ")[0]!);
    // One click moves forward once, and never past the disclosed date. It
    // may stop earlier only for something that needs the player.
    expect(reached).toBeGreaterThan(before_);
    expect(reached).toBeLessThanOrEqual(Date.parse(disclosed));
  }
});
