import { test, expect } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { fillCreator, enterLife } from "./support/creator";
import { join } from "node:path";
import { resolveExplicitCreatorHometown } from "../../src/presentation/new-game-geography";
const seed = "session2-kit13-oct5";
const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
const state = lifePlaceStateIdentities().find(
  (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
)!;
const hometown = resolveExplicitCreatorHometown({
  place: place.displayName,
  state: state.name,
});
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
  const identity = page.getByTestId("creator-summary-character");
  const recordedName = await identity
    .locator(".creator-summary-name")
    .innerText();
  await identity.focus();
  await page.keyboard.press("Enter");
  const first = await page
    .getByLabel("First name", { exact: true })
    .inputValue();
  const last = await page.getByLabel("Last name", { exact: true }).inputValue();
  expect(recordedName.toLowerCase()).toBe(`${first} ${last}`.toLowerCase());
  await page.getByTestId("creator-continue-character").click();
  await page.getByTestId("creator-change-state").click();
  const stateSearch = page.getByTestId("state-search");
  await stateSearch.fill(state.name);
  await page
    .getByRole("button", { name: "Clear state search", exact: true })
    .click();
  await expect(stateSearch).toHaveValue("");
  await expect(stateSearch).toBeFocused();
  await stateSearch.fill(state.name);
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "state-search.png"),
  });
  await page
    .getByRole("button", { name: "Return to states", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const stateChoice = page.getByTestId(`state-${state.usps}`);
  await expect(stateChoice).toBeFocused();
  await stateChoice.click();
  const placeSearch = page.getByTestId("place-search");
  await placeSearch.fill(hometown.townQuery ?? "");
  await page
    .getByRole("button", { name: "Clear place search", exact: true })
    .click();
  await expect(placeSearch).toHaveValue("");
  await expect(placeSearch).toBeFocused();
  await placeSearch.fill(hometown.townQuery ?? "");
  await expect(placeSearch).toHaveCSS("border-top-width", "0px");
  await expect(placeSearch).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(placeSearch).toHaveCSS("outline-style", "none");
  await page.screenshot({
    path: join(info.config.metadata.artifacts, "place-search.png"),
  });
  await page
    .getByRole("button", { name: "Return to places", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const townChoice = page
    .getByTestId("place-choices")
    .getByRole("button")
    .first();
  await expect(townChoice).toBeFocused();
  await expect(townChoice).toContainText(place.displayName);
  await townChoice.click();
  await page.getByTestId("creator-continue-place").click();
  await page.getByTestId("whoareyou-play").click();
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
