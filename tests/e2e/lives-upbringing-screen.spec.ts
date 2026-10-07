import { expect, test } from "./fixtures";

import { sampledProofLocalityForState } from "../../src/presentation/new-game-geography";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { enterLife, openShellMenu, startLife } from "./support/creator";

/**
 * LIVES step 5: "Who you are" tells the player how they grew up, from the
 * upbringing record, at a desktop and a phone viewport. The place is drawn from
 * all 56 by the seed. What happens around the player (a birth, a neighbor's job
 * loss, a move, a death) is proven on its recorded facts in
 * src/presentation/lives-record.test.ts; it needs months of play to occur
 * naturally, which this spec does not run.
 */
const SEED = "lives-screens-browser-1";
const STATES = lifePlaceStateIdentities();
const seedIndex = [...SEED].reduce(
  (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
  7,
);
const state = STATES[seedIndex % STATES.length]!;
const town = sampledProofLocalityForState(state.jurisdictionKey);

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`Who you are says how you grew up at ${viewport.width} wide (${town.displayName}, ${state.name}, ${town.key}, one of ${STATES.length}, seed ${SEED})`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await page.goto(`/?seed=${SEED}-${viewport.width}`);
    await startLife(page, {
      place: town.displayName,
      state: state.name,
      age: 30,
      route: "custom",
      household: "lives-alone",
    });
    await enterLife(page);
    await openShellMenu(page);
    await page.getByTestId("nav-group-personal").click();
    await page.getByTestId("nav-personal").click();

    const grew = page.getByTestId("personal-upbringing");
    await expect(grew).toBeVisible();
    await expect(grew.locator("li")).not.toHaveCount(0);
    expect(await grew.locator("li").count()).toBeGreaterThanOrEqual(3);
    await grew.scrollIntoViewIfNeeded();
    // No sideways scroll at the phone width.
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath(`who-you-are-${viewport.width}.png`),
    });
  });
}
