import { expect, test } from "./fixtures";

import { sampledProofLocalityForState } from "../../src/presentation/new-game-geography";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import {
  chooseCreatorLocation,
  completeCharacterStep,
  enterLife,
  goTo,
  openCreator,
} from "./support/creator";

/**
 * A148: the parent who is not raising the character is the player's answer,
 * asked on the custom route's "At home" step, and the life records what was
 * said. The place is drawn from all 56 by the seed.
 */
const SEED = "a148-browser-1";
const STATES = lifePlaceStateIdentities();
// A plain string hash of the seed picks one of the 56; nothing else uses it.
const seedIndex = [...SEED].reduce(
  (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
  7,
);
const state = STATES[seedIndex % STATES.length]!;
const town = sampledProofLocalityForState(state.jurisdictionKey);

test(`asks about the other parent and records the answer (${town.displayName}, ${state.name}, ${town.key}, one of ${STATES.length}, seed ${SEED})`, async ({
  page,
}) => {
  test.setTimeout(300_000);
  // Whether one parent raises the child comes from the world's identity, so
  // walk fixed session seeds until a life that has one comes up.
  let asked = false;
  for (let attempt = 0; attempt < 16 && !asked; attempt += 1) {
    await page.goto(`/?seed=${SEED}-${attempt}`);
    await openCreator(page);
    await page.getByTestId("start-custom").click();
    await completeCharacterStep(page, 10, {
      givenName: "Avery",
      familyName: "Morgan",
    });
    await page.getByTestId("creator-continue-character").click();
    await chooseCreatorLocation(
      page,
      { age: 10, place: town.displayName, state: state.name },
      true,
    );
    await expect(page.getByTestId("creator-stage-background")).toBeVisible();
    await page.getByTestId("lives-alone").click();
    asked = (await page.getByTestId("other-parent-choices").count()) > 0;
  }
  expect(asked, "no session seed opened a one-parent family").toBe(true);

  const choices = page.getByTestId("other-parent-choices");
  await expect(choices.getByRole("button")).toHaveCount(3);
  // Nothing is chosen until the player chooses.
  await expect(choices.locator(".is-chosen")).toHaveCount(0);
  await page.getByTestId("other-parent-deceased").click();
  await expect(page.getByTestId("other-parent-deceased")).toHaveClass(
    /is-chosen/,
  );
  await page.getByTestId("creator-continue-background").click();
  await page.getByTestId("whoareyou-play").click();
  await page.getByTestId("begin").click();
  // The world is built before play opens; give it the time it takes.
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);

  await goTo(page, "nav-group-personal");
  await page.getByTestId("nav-personal").click();
  await page.getByTestId("life-introduction").locator("summary").click();
  await expect(page.getByTestId("life-grounding")).toContainText("has died");
});
