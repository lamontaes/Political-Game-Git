import "../../src/simulation";
import { test, expect } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { fillCreator, enterLife, openShellMenu, goTo } from "./support/creator";
import { join } from "node:path";

const seed = "session12-all-place-removal-oct6";
const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
const state = lifePlaceStateIdentities().find(
  (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
)!;

test("ordinary random-place entry keeps shared geography and a saved life", async ({
  page,
}, info) => {
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await fillCreator(page, {
    place: place.displayName,
    state: state.name,
    age: 18,
    route: "normal",
  });
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "ordinary-creator.png"),
  });
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 90_000,
  });
  await enterLife(page);
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "ordinary-life.png"),
  });
  await goTo(page, "nav-calendar");
  const calendar = page.getByTestId("calendar-workspace");
  await expect(calendar).toBeVisible();
  await expect(calendar).not.toContainText("Lexington time");
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "ordinary-calendar.png"),
  });
  await page.getByTestId("calendar-workspace-close").click();
  await expect(calendar).toBeHidden();
  await page.getByTestId("shell-nav-cluster").focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("nav-calendar").focus();
  await page.keyboard.press("Enter");
  await expect(calendar).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(calendar).toBeHidden();
  await expect(page.getByTestId("open-floor")).toHaveCount(0);
  await openShellMenu(page);
  await page.getByTestId("keep-world").click();
  await expect(
    page.getByRole("status").filter({ hasText: /^Saved\.$/ }),
  ).toBeVisible({ timeout: 30_000 });
  await goTo(page, "leave-game");
  await page.getByTestId("leave-without-saving").click();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "ordinary-continued.png"),
  });
  await info.attach("random-place", {
    body: JSON.stringify({
      seed,
      key: place.key,
      sourceGeoid: place.sourceGeoid,
      jurisdictionId: place.context.jurisdiction.id,
      place: place.displayName,
      state: state.name,
      startAge: 18,
      route: "normal",
      bargaining:
        "No office or selected docket in this ordinary start; no natural seated-entry claim.",
    }),
    contentType: "application/json",
  });
});
