import { expect, test } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { enterLife, goTo } from "./support/creator";

const place = drawRandomPlace("session-46-mr-12", (row) => {
  const jurisdiction = row.stateJurisdictionKey
    ? stateJurisdictionForKey(row.stateJurisdictionKey)
    : null;
  return (
    row.scope === "locality" &&
    jurisdiction !== null &&
    lifePlaceByJurisdictionId(jurisdiction.id)?.capabilities
      .legislativeScenarioKey != null
  );
});
if (!place.stateJurisdictionKey)
  throw new Error(`No jurisdiction for ${place.key}.`);

test("MR-12 Transit screen from a new game", async ({ page }, info) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(60_000);
  const label = process.env.MR12_SCREEN_LABEL;
  if (label !== "main" && label !== "branch")
    throw new Error("Set MR12_SCREEN_LABEL to main or branch.");
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(async (stateKey) => {
    const fixturePath = "/tests/fixtures/" + "supplied-legislative-seat.ts";
    const { suppliedLegislativeSeat } = await import(fixturePath);
    const world = suppliedLegislativeSeat(stateKey, "house");
    const saveStorePath = "/src/presentation/" + "browser-world-repository.ts";
    const { BrowserSaveStore } = await import(saveStorePath);
    const store = new BrowserSaveStore();
    const outcome = await store.save(world, store.newSaveId(world));
    if (outcome.status !== "saved") throw new Error("New game save failed.");
  }, place.stateJurisdictionKey);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("open-saves").click();
  await page
    .getByTestId("save-entry")
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await enterLife(page);
  await goTo(page, "nav-politics");
  await page.getByTestId("politics-tab-issues").click();
  await page.getByTestId("politics-sub-transit").click();
  await expect(page.locator("section.transit-workspace")).toBeVisible();
  await page.screenshot({
    path: info.outputPath(`mr-12-transit-${label}.png`),
    fullPage: true,
  });
});
