import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { expect, test } from "./fixtures";
import { fillCreator } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";

/**
 * Owner playtest A9 (October 8, 2026): a new life no longer drops the player
 * cold into a room. When the world introduction closes, the first moment
 * opens over the room and says, from the records, who the player is, where
 * they live and work, and what put them where they are now. Returning to the
 * room closes it. The place is drawn from all 56 by the seed.
 */
test("a new life opens with what put the player where they are", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  const seed = "p6-a9-first-day-context";
  const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
  const state = lifePlaceStateIdentities().find(
    (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
  )!;
  console.log(
    JSON.stringify({ seed, place: place.displayName, state: state.name }),
  );
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 90_000 });
  await fillCreator(page, {
    age: 34,
    place: place.displayName,
    state: state.name,
  });
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 120_000,
  });

  const intro = page.getByTestId("world-orientation");
  await expect(intro).toBeVisible({ timeout: 90_000 });
  await page.getByTestId("orientation-skip").click();
  await expect(intro).toBeHidden();

  // The first moment is open, and it says where the life stands.
  const moment = page.getByTestId("pending-life-surface");
  await expect(moment).toBeVisible();
  const passage = page.getByTestId("story-passage");
  await expect(passage).toContainText(`You're 34, and you live in`);
  // What put the player here, in the words of the record that did.
  await expect(page.getByTestId("story-prose")).toHaveText(
    /^You are (at .+ for your scheduled shift|home; your work schedule has no shift at this hour|at home)\.$/,
  );
  await page.screenshot({ path: info.outputPath("first-day-moment.png") });

  // Returning to the room closes it, and the room is there.
  await page.getByTestId("pending-life-return").click();
  await expect(moment).toBeHidden();
  await expect(page.getByTestId("scene-place-backdrop")).toBeVisible();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
});
