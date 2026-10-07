import { expect, test } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { enterLife, fillCreator, openShellMenu } from "./support/creator";

const place = drawRandomPlace(
  "session-46-mr-12",
  (row) => row.scope === "locality",
);
if (!place.stateJurisdictionKey)
  throw new Error(`No jurisdiction for ${place.key}.`);
const state = lifePlaceStateIdentities().find(
  (row) => row.jurisdictionKey === place.stateJurisdictionKey,
);
if (!state) throw new Error(`No state identity for ${place.key}.`);

test("MR-12 Transit screen from a new game", async ({ page }) => {
  test.setTimeout(300_000);
  const label = process.env.MR12_SCREEN_LABEL;
  if (label !== "main" && label !== "branch")
    throw new Error("Set MR12_SCREEN_LABEL to main or branch.");
  await page.goto("/");
  await fillCreator(page, {
    place: place.displayName,
    state: state.name,
    age: 35,
  });
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 90_000,
  });
  await enterLife(page);
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  await page
    .getByRole("group", { name: "Move time" })
    .getByRole("button", { name: "Day", exact: true })
    .click();
  await openShellMenu(page);
  await page.getByTestId("nav-group-politics").click();
  await page.getByTestId("nav-politics-transit").click();
  await expect(page.getByTestId("transit-workspace")).toBeVisible();
  await page.screenshot({
    path: `docs/release/screenshots/mr-12-transit-${label}.png`,
    fullPage: true,
  });
});
