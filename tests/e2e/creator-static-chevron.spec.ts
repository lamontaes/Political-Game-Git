import { test, expect } from "./fixtures";
import { fillCreator } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { join } from "node:path";

const seed = "session2-creator-confirmation-baseline";
const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
const state = lifePlaceStateIdentities().find(
  (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
)!;

test("Creator primary corner appears only while the static Next button is activated", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/?seed=${seed}`);
  await fillCreator(page, {
    age: 34,
    place: place.displayName,
    state: state.name,
    calibration: "short",
  });
  await page.getByTestId("creator-summary-character").click();
  const next = page.getByTestId("creator-continue-character");
  const image = () =>
    next.evaluate((element) => getComputedStyle(element).backgroundImage);
  const states: Record<string, string> = {};
  states.rest = await image();
  expect(states.rest).not.toContain("primary-corner.svg");
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "creator-next-rest.png"),
  });
  await next.hover();
  states.hover = await image();
  expect(states.hover).not.toContain("primary-corner.svg");
  await page.mouse.down();
  states.pointerHeld = await image();
  expect(states.pointerHeld).toContain("primary-corner.svg");
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "creator-next-held.png"),
  });
  // Release outside the button so its normal Next action does not run yet.
  await page.mouse.move(1900, 1060);
  await page.mouse.up();
  states.released = await image();
  expect(states.released).not.toContain("primary-corner.svg");
  await next.focus();
  await page.keyboard.down("Space");
  states.keyboardHeld = await image();
  expect(states.keyboardHeld).toContain("primary-corner.svg");
  await page.keyboard.up("Space");
  await expect(page.getByTestId("creator-stage-place")).toBeVisible();
  console.log(
    JSON.stringify({
      seed,
      place: place.displayName,
      placeKey: place.key,
      states,
    }),
  );
});
