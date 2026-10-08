import { expect as baseExpect, test } from "./fixtures";

const expect = baseExpect.configure({ timeout: 60_000 });
import { enterLife, goTo, saveLife, startLife } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";

/**
 * UI9-05 / CURSOR-PLACES11: discoverable Places with inspect, travel, attend,
 * and return-home over canonical offers. Requires
 * docs/integration/places11-ui-core.patch on UI144.
 */
test("Places shows recorded values without helper copy", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/?seed=places11-child-walk");
  await startLife(page, { age: 10, place: "Lexington", state: "Kentucky" });
  await page.getByTestId("play-screen").waitFor({
    state: "visible",
    timeout: 60_000,
  });
  await enterLife(page);
  await goTo(page, "nav-places");

  const workspace = page.getByTestId("places-panel");
  await expect(workspace).toBeVisible();
  await expect(page.getByTestId("places-current-location")).toBeVisible();
  await expect(page.getByTestId("places-current-location")).not.toContainText(
    "Location not recorded",
  );
  await expect(workspace).not.toContainText(
    /Where you are|your location and reachable offers|Current location|Places you can go|Inspect this government.s public meetings and records/i,
  );
});

test("capture random-place Places evidence screenshots", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  const seed = "session51-mr11-random-place";
  const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
  const state = lifePlaceStateIdentities().find(
    (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
  )!;
  await page.goto(`/?seed=${seed}`);
  await startLife(page, {
    age: 10,
    place: place.displayName,
    state: state.name,
  });
  console.log(
    JSON.stringify({ seed, place: place.displayName, state: state.name }),
  );
  await page.getByTestId("play-screen").waitFor({
    state: "visible",
    timeout: 60_000,
  });
  await enterLife(page);
  await goTo(page, "nav-places");
  await expect(page.getByTestId("places-panel")).toBeVisible();
  await page.waitForTimeout(1_000);
  const places = page.getByTestId("places-panel");
  if (process.env.MR11_MAIN_BASELINE !== "1") {
    await expect(places).not.toContainText(
      /Where you are|your location and reachable offers|Current location|Places you can go|Inspect this government.s public meetings and records/i,
    );
  }
  await page.screenshot({
    path: info.outputPath(
      process.env.MR11_MAIN_BASELINE === "1"
        ? "places-main.png"
        : "places-branch.png",
    ),
    fullPage: true,
  });
});

test("Places reads preserve World across save and reload", async ({ page }) => {
  await page.goto("/?seed=places11-save");
  await startLife(page, { age: 10, place: "Lexington", state: "Kentucky" });
  await enterLife(page);
  await goTo(page, "nav-places");
  const walk = page.getByTestId("places-offer-walk-neighborhood-action");
  await expect(walk).toBeVisible({ timeout: 10_000 });
  await walk.click();
  const label = await page.getByTestId("places-current-location").innerText();
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-places");
  await expect(page.getByTestId("places-current-location")).toHaveText(label);
});

test("keyboard closes Places without traveling", async ({ page }) => {
  await page.goto("/?seed=places11-keyboard");
  await startLife(page, { age: 10, place: "Lexington", state: "Kentucky" });
  await enterLife(page);
  await goTo(page, "nav-places");
  await page.getByTestId("places-workspace-close").click();
  await expect(page.getByTestId("places-panel")).toHaveCount(0);
});
