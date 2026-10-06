import { expect, test } from "./fixtures";
import { completeCharacterStep, openCreator } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";

const seed = "session-101-bg20-direct-place";
const place = drawRandomPlace(
  seed,
  (candidate) => candidate.scope === "locality",
);
const state = lifePlaceStateIdentities().find(
  (candidate) => candidate.jurisdictionKey === place.stateJurisdictionKey,
)!;

test(`choosing ${place.displayName} goes straight to the next creator step (${seed})`, async ({
  page,
}) => {
  await page.goto(`/?seed=${seed}`);
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await completeCharacterStep(page, 30);
  await page.getByTestId("creator-continue-character").click();

  await page.getByTestId("state-search").fill(state.name);
  await page.getByTestId(`state-${state.usps}`).click();
  await page.getByTestId("place-search").fill(place.displayName);
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: new RegExp(place.displayName, "i") })
    .first()
    .click();

  await expect(page.getByTestId("creator-stage-difficulty")).toBeVisible();
  await expect(page.getByTestId("creator-continue-place")).toHaveCount(0);
});
