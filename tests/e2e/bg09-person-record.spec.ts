import { expect, test } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { enterLife, goTo, startLife } from "./support/creator";

const seed = "bg09-person-record-random-place-2026-10-07";
const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
const state = lifePlaceStateIdentities().find(
  (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
);

test("a person record shows age in a random-place new game", async ({
  page,
}, info) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await startLife(page, {
    age: 40,
    place: place.displayName,
    state: state!.name,
    household: "shares-a-home",
  });
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 120_000,
  });
  await enterLife(page);
  await goTo(page, "elsewhere-people");
  await page.getByTestId("people-web-expand").click();
  const person = page.locator('[data-testid^="people-person-"]').first();
  await expect(person).toBeVisible();
  await person.click();
  await expect(page.getByTestId("quick-dossier")).toBeVisible();
  await page.getByTestId("quick-dossier-full").click();
  const record = page.getByTestId("full-dossier");
  await expect(record).toBeVisible();
  await page.screenshot({
    path: info.outputPath("bg09-person-record.png"),
    fullPage: true,
  });
  await expect(record.getByTestId("dossier-age")).toBeVisible();
});
