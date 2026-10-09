import { expect, test, type Page } from "./fixtures";
import { startLife } from "./support/creator";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { drawRandomPlace } from "../support/random-place";

/**
 * From New Game to a first playable day (Lamontae, Sept. 28: "sit down and
 * play today").
 *
 * The opening (owner, October 8, 2026, revised 11:14 p.m.) cuts from the
 * country to the character in six stops: the President's address, the
 * player's members of Congress in the chamber, the governor, the town, the
 * family at home, then the player. Every cut shows its place, and the walk
 * must land on a first day with at least one thing to do. Places are drawn
 * from all 56 by the named seeds.
 */

const STOPS = ["country", "representatives", "state", "town", "home", "you"];

function lifeIn(seed: string, age: number) {
  const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
  const state = lifePlaceStateIdentities().find(
    (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
  )!;
  console.log(JSON.stringify({ seed, place: place.displayName, age }));
  return { place: place.displayName, state: state.name, age };
}

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

/** Every cut of the opening, in order, until it closes. */
async function walkOpening(page: Page): Promise<string[]> {
  const intro = page.getByTestId("world-orientation");
  // Begin builds the world behind a progress screen first, about 13 seconds
  // in a cloud machine (#3896); the opening follows it.
  await expect(intro).toBeVisible({ timeout: 60_000 });
  // The Ledger holds every number and starts closed.
  await expect(page.getByTestId("opening-ledger")).toHaveCount(0);
  const seen: string[] = [];
  for (let screen = 0; screen < 12; screen += 1) {
    if (!(await intro.isVisible())) break;
    const key = (await intro.getAttribute("data-step")) ?? "";
    seen.push(key);
    // Every cut fills the frame with its place.
    await expect(
      page
        .locator(".pg-scene-chapter:not([aria-hidden])")
        .getByTestId("orientation-place-backdrop"),
      key,
    ).toBeVisible();
    await page.getByTestId("orientation-next").click();
    // The next cut arrives, or the opening closes on the last one.
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

test("an adult's opening cuts from the country to the player and lands on a day with something to do", async ({
  page,
}) => {
  await freshBrowser(page);
  await startLife(page, lifeIn("opening-flow-adult", 34));
  expect(await walkOpening(page)).toEqual(STOPS);
  await expectSomethingToDo(page);
});

test("a child's opening cuts to the family who raised them and lands on a day with something to do", async ({
  page,
}) => {
  await freshBrowser(page);
  await startLife(page, lifeIn("opening-flow-child", 12));
  expect(await walkOpening(page)).toEqual(STOPS);
  await expectSomethingToDo(page);
});
