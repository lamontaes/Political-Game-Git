import { expect, test, type Page } from "./fixtures";
import { startLife } from "./support/creator";

/**
 * From New Game to a first playable day (Lamontae, Sept. 28: "sit down and
 * play today").
 *
 * The opening walks from the country to the character: the year, the White
 * House, your state and its legislature, Congress, your county and town,
 * then your family and your life so far. Every screen must say something
 * read from the world, and the walk must land on a first day with at least
 * one thing to do.
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

/** Every screen of the opening, in order, until it closes. */
async function walkOpening(page: Page): Promise<string[]> {
  const intro = page.getByTestId("world-orientation");
  await expect(intro).toBeVisible();
  const seen: string[] = [];
  for (let screen = 0; screen < 12; screen += 1) {
    if (!(await intro.isVisible())) break;
    const key = (await intro.getAttribute("data-step")) ?? "";
    seen.push(key);
    const title = page.getByTestId(`orientation-step-${key}`);
    await expect(title).toBeVisible();
    // Every screen says something beyond its title.
    const copy = await intro
      .locator(".pg-orientation-copy")
      .filter({ has: title })
      .innerText();
    expect(copy.trim().length, `${key} is empty`).toBeGreaterThan(
      (await title.innerText()).length + 30,
    );
    expect(copy).not.toMatch(/No one else is recorded|in this fictional world/);
    await page.getByTestId("orientation-next").click();
    // The next screen arrives, or the opening closes on the last one.
    await expect
      .poll(async () =>
        (await intro.isVisible()) ? await intro.getAttribute("data-step") : "",
      )
      .not.toBe(key);
  }
  await expect(intro).toBeHidden();
  return seen;
}

/** The first day offers at least one thing to do, and it can be done. */
async function expectSomethingToDo(page: Page) {
  await expect(page.getByTestId("play-screen")).toBeVisible();
  const opener = page.getByTestId("open-moment");
  const story = page.getByTestId("story-section");
  await expect(opener.or(story)).toBeVisible();
  if (await opener.isVisible()) await opener.click();
  await expect(story).toBeVisible();
  const choices = story.getByRole("button");
  expect(await choices.count()).toBeGreaterThan(0);
}

test.use({ viewport: { width: 1280, height: 800 } });

test("an adult's opening walks from the year to their family and lands on a day with something to do", async ({
  page,
}) => {
  await freshBrowser(page);
  await startLife(page, { place: "Lexington", state: "Kentucky", age: 34 });
  const seen = await walkOpening(page);
  expect(seen).toEqual([
    "year",
    "executive",
    "state",
    "legislature",
    "congress",
    "locality",
    "parents",
    "your-life",
  ]);
  await expectSomethingToDo(page);
});

test("a child's opening names who raised them and lands on a day with something to do", async ({
  page,
}) => {
  await freshBrowser(page);
  await startLife(page, {
    place: "Minneapolis",
    state: "Minnesota",
    age: 12,
  });
  const seen = await walkOpening(page);
  expect(seen.slice(0, 6)).toEqual([
    "year",
    "executive",
    "state",
    "legislature",
    "congress",
    "locality",
  ]);
  expect(seen).toContain("parents");
  expect(seen.at(-1)).toBe("your-life");
  await expectSomethingToDo(page);
});
