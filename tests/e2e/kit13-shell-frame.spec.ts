import { test, expect } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { fillCreator, enterLife, openShellMenu, goTo } from "./support/creator";
import { join } from "node:path";

const seed = "session2-kit13-oct5";
const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
const state = lifePlaceStateIdentities().find(
  (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
);

test("shell opens and closes a real random-place life with reachable controls", async ({
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
  await openShellMenu(page);
  await page.getByTestId("shell-nav-flyout").evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
  });
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "shell-menu.png"),
  });
  await page.getByTestId("nav-calendar").click();
  const workspace = page.getByTestId("calendar-workspace");
  await expect(workspace).toBeVisible();
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "shell-workspace.png"),
  });
  await page.getByTestId("calendar-workspace-close").click();
  await expect(workspace).toBeHidden();
  await page.getByTestId("shell-nav-cluster").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("shell-nav-flyout")).toBeVisible();
  await page.getByTestId("nav-calendar").focus();
  await page.keyboard.press("Enter");
  await expect(workspace).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(workspace).toBeHidden();
  await page.setViewportSize({ width: 1024, height: 768 });
  await openShellMenu(page);
  await page.getByTestId("nav-calendar").click();
  await expect(page.getByTestId("calendar-workspace-close")).toBeInViewport();
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "shell-narrow.png"),
  });
  await page.keyboard.press("Escape");
  await expect(workspace).toBeHidden();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await goTo(page, "elsewhere-people");
  await page.locator(".pg-people-search summary").click();
  const search = page.getByTestId("people-search");
  await search.fill("a");
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "shell-search.png"),
  });
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await search.fill("a");
  await page
    .getByRole("button", { name: "Return to people", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(search).toBeHidden();
  await page.locator(".pg-people-search summary").click();
  await expect(search).toHaveValue("a");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "People", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "People", exact: true }),
  ).toBeHidden();
  await openShellMenu(page);
  await page.getByTestId("keep-world").click();
  await expect(page.getByTestId("save-world")).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("status").filter({ hasText: /^Saved\.$/ }),
  ).toBeVisible();
  await goTo(page, "leave-game");
  await expect(page.getByTestId("leave-confirm")).toBeVisible();
  await page.getByTestId("leave-without-saving").click();
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  await info.attach("random-place", {
    body: JSON.stringify({ seed, place: place.displayName, state }),
    contentType: "application/json",
  });
});
