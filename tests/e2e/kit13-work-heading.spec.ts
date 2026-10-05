import { test, expect } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { fillCreator, enterLife, goTo } from "./support/creator";
import { join } from "node:path";

const seed = "session2-kit13-oct5";
const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
const state = lifePlaceStateIdentities().find(
  (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
);

test("work shows a decision heading only beside actual recorded decisions", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "title.png"),
  });
  await fillCreator(page, {
    place: place.displayName,
    state: state!.name,
    age: 35,
  });
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "creator.png"),
  });
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("life-start-transition")).toBeVisible();
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "loading.png"),
  });
  // Preparation reports real asynchronous work; do not inherit the helper's
  // five-second assertion while the court and government writers are running.
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 90_000,
  });
  await enterLife(page);
  await goTo(page, "nav-jobs");
  const workspace = page.getByTestId("personal-work-section");
  await expect(workspace).toBeVisible();
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "work.png"),
  });
  const heading = workspace.getByRole("heading", {
    name: "Waiting on you",
    exact: true,
  });
  if (await workspace.getByTestId("work-pending").count()) {
    await expect(heading).toBeVisible();
    expect(
      await workspace.getByTestId("work-pending").locator("li").count(),
    ).toBeGreaterThan(0);
  } else {
    await expect(heading).toBeHidden();
  }
});
