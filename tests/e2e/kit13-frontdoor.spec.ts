import { test, expect } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { fillCreator, enterLife } from "./support/creator";
import { join } from "node:path";
const seed = "session2-kit13-oct5";
const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
const state = lifePlaceStateIdentities().find(
  (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
)!;
test("title and creator keep pointer and keyboard choices reachable", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "title.png"),
  });
  await page.getByTestId("new-game").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("setup-screen")).toBeVisible();
  await page
    .getByRole("button", { name: "Return to title", exact: true })
    .click();
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await fillCreator(page, {
    place: place.displayName,
    state: state.name,
    age: 35,
  });
  await expect(page.getByTestId("creator-engine-figure")).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "creator.png"),
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByTestId("begin").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("begin")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Back", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "creator-narrow.png"),
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 90_000,
  });
  await enterLife(page);
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
});
