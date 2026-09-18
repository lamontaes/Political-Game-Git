import { expect, test, type Page } from "./fixtures";
import { enterLife, startLife as walkCreator } from "./support/creator";

/**
 * GOVERNING increment 1: the generic "Let time pass" control says where it
 * will stop before it runs, and one click moves the clock exactly once.
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

const MONTH_DATE = /to ([A-Z][a-z]+ \d{1,2}, \d{4})/;

test("the quiet stretch discloses its end date and lands there once", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await freshBrowser(page);
  await page.goto("/?seed=governing-time-command");
  await walkCreator(page, { place: "Lexington", state: "Kentucky", age: 41 });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
  // The moment is the room's own panel, so this reads it where the player
  // sees it. It used to open Personal's "Your day" disclosure to reach it.
  const story = page.getByTestId("story-section");
  await expect(story).toBeVisible();
  for (let step = 0; step < 3; step += 1) {
    const target = page.getByTestId("story-let-time-pass-target");
    await expect(target).toContainText(MONTH_DATE);
    const disclosed = (await target.innerText()).match(MONTH_DATE)![1]!;
    const before = await story.getByTestId("story-when").innerText();
    await page.getByTestId("story-let-time-pass").click();
    await expect(story.getByTestId("story-when")).not.toHaveText(before);
    const after = await story.getByTestId("story-when").innerText();
    const reached = Date.parse(after.split(" · ")[0]!);
    const before_ = Date.parse(before.split(" · ")[0]!);
    // One click moves forward once, and never past the disclosed date. It
    // may stop earlier only for something that needs the player.
    expect(reached).toBeGreaterThan(before_);
    expect(reached).toBeLessThanOrEqual(Date.parse(disclosed));
  }
});
