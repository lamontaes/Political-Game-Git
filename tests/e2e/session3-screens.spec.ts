import { expect, test } from "./fixtures";
import { enterLife, goTo, startLife } from "./support/creator";
import { enterRecordedMemberTerm } from "./support/legislative-entry";
import { drawRandomPlace } from "../support/random-place";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";

test("Session 3 screens in a random new life", async ({ page }, info) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(60_000);
  const seed = "session3-kit13-20261005";
  const place = drawRandomPlace(seed, (entry) => entry.scope === "locality");
  info.annotations.push({
    type: "random-place",
    description: `${place.displayName}; ${seed}`,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/?seed=${seed}`, { waitUntil: "domcontentloaded" });
  await startLife(page, { age: 34, place: place.displayName });
  await page
    .getByTestId("orientation-skip")
    .waitFor({ state: "visible", timeout: 60_000 });
  await page.getByTestId("orientation-skip").click();
  await enterLife(page);
  await page.screenshot({ path: info.outputPath("home.png") });
  for (const [name, destination] of [
    ["personal", "nav-personal"],
    ["people", "elsewhere-people"],
    ["money", "nav-finances"],
    ["calendar", "nav-calendar"],
    ["news", "nav-news"],
    ["places", "nav-places"],
    ["governing", "nav-politics"],
  ]) {
    await goTo(page, destination!);
    const menu = page.getByTestId("shell-nav-cluster");
    if ((await menu.getAttribute("aria-expanded")) === "true")
      await menu.click();
    await expect(page.locator(".pg-workspace")).toBeVisible();
    if (name === "governing") {
      await page.getByTestId("politics-sub-overview").click();
      await expect(page.locator(".pg-government")).toBeVisible();
    }
    if (name === "money")
      await page.getByTestId("personal-finances").scrollIntoViewIfNeeded();
    else {
      await page.locator(".pg-workspace-body").evaluateAll((nodes) =>
        nodes.forEach((node) => {
          node.scrollTop = 0;
        }),
      );
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images)
          .filter((img) => img.getBoundingClientRect().width > 0)
          .map((img) => img.decode().catch(() => undefined)),
      );
    });
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
    if (name === "calendar") {
      await page.getByTestId("calendar-layout-week").click();
      await page.getByTestId("calendar-layout-month").press("Enter");
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(
        page.getByTestId("calendar-workspace-close"),
      ).toBeInViewport();
      await page.screenshot({ path: info.outputPath("calendar-narrow.png") });
      await page.setViewportSize({ width: 1920, height: 1080 });
    }
    if (name === "news") {
      await page.getByTestId("news-section-press").click();
      await page.screenshot({ path: info.outputPath("press.png") });
    }
    if (name === "people") {
      const ring = page.locator(".pg-relationship-web-ring").last();
      await ring.focus();
      await page.keyboard.press("Enter");
      await page.screenshot({ path: info.outputPath("people-selected.png") });
      await page.keyboard.press("Escape");
      await page.getByTestId("people-view-list").click();
      await page.getByTestId("people-view-web").press("Enter");
      await page.getByRole("button", { name: /^Home and family/ }).click();
      await page.locator('[data-testid^="people-person-"]').first().click();
      const details = page.getByRole("button", {
        name: "More details",
        exact: true,
      });
      if (await details.isVisible()) await details.click();
      if (await page.getByTestId("person-contact").isVisible()) {
        await page.getByTestId("person-contact").click();
        await expect(page.getByTestId("contact-dialog")).toBeVisible();
        await expect(page.getByTestId("contact-dialog")).toHaveCSS(
          "opacity",
          "1",
        );
      }
      await page.screenshot({ path: info.outputPath("contact.png") });
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("contact-dialog")).toHaveCount(0);
    }
    if (name === "governing") {
      if (process.env.SESSION3_CAPTURE_BEFORE !== "1") {
        await expect(page.getByTestId("politics-tab-office")).toHaveCount(0);
        await expect(page.getByTestId("politics-tab-issues")).toHaveCount(0);
      }
      await page.getByTestId("politics-tab-campaigns").click();
      await page.screenshot({ path: info.outputPath("campaign.png") });
    }
  }
});

test("Session 3 office and transit screens use the held office", async ({
  page,
}, info) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(60_000);
  const seed = "session3-office-kit13-20261005";
  const place = drawRandomPlace(seed, (entry) => {
    const state = entry.stateJurisdictionKey
      ? stateJurisdictionForKey(entry.stateJurisdictionKey)
      : null;
    return (
      entry.scope === "locality" &&
      state !== null &&
      lifePlaceByJurisdictionId(state.id)?.capabilities
        .legislativeScenarioKey != null
    );
  });
  info.annotations.push({
    type: "random-place",
    description: `${place.displayName}; ${seed}`,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/?seed=${seed}`, { waitUntil: "domcontentloaded" });
  await startLife(page, {
    age: 34,
    state: stateJurisdictionForKey(place.stateJurisdictionKey!)!.name,
    statewide: true,
    route: "custom",
    office: true,
  });
  const intro = page.getByTestId("orientation-skip");
  await intro.waitFor({ state: "visible", timeout: 60_000 });
  await intro.click();
  await enterLife(page);
  await goTo(page, "nav-politics");
  if (process.env.SESSION3_CAPTURE_BEFORE !== "1")
    await expect(page.getByTestId("politics-tab-office")).toHaveCount(0);
  await enterRecordedMemberTerm(page);
  await expect(page.getByTestId("politics-tab-office")).toBeVisible();
  await page.screenshot({ path: info.outputPath("office.png") });
  info.annotations.push({
    type: "supplied-boundary",
    description:
      "Transit uses the existing recorded legislative-term fixture; it does not prove an ordinary election.",
  });
  await page.getByTestId("politics-tab-issues").click();
  await page.getByTestId("politics-sub-transit").click();
  await expect(page.locator(".transit-workspace")).toBeVisible();
  await page.screenshot({ path: info.outputPath("transit.png") });
});
