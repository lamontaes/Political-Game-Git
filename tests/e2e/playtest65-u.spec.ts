import { expect, test } from "./fixtures";
import {
  enterLife,
  fillCreator,
  goTo,
  openPoliticsHub,
  openShellMenu,
  saveLife,
} from "./support/creator";

test.describe.configure({ timeout: 240_000 });

test("PLAYTEST65 creator, opening, map and movable Calendar preserve the life", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto("/?art-preview=candidate&seed=playtest65-u-ordinary", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await expect(page.getByTestId("title-establishing-plate")).toBeVisible();
  await page.screenshot({ path: info.outputPath("title.png") });
  await fillCreator(page, {
    age: 34,
    state: "Kentucky",
    place: "Lexington",
    givenName: "Alexandra",
    familyName: "Montgomery-Washington",
  });
  const begin = page.getByTestId("begin");
  await expect(
    page.locator(
      '.kit41-creator-preview [data-material-group-state="loading"]',
    ),
  ).toHaveCount(0, { timeout: 60_000 });
  await expect(
    page.locator(
      '.kit41-creator-preview [data-material-group-state="unavailable"]',
    ),
  ).toHaveCount(0);
  for (const viewport of [
    { width: 1280, height: 860 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(begin).toBeInViewport();
    const figure = page.locator(
      ".kit41-creator-preview .wardrobe-figure-stage",
    );
    await expect(figure).toBeVisible();
    const frame = await figure.boundingBox();
    const actions = await begin.boundingBox();
    expect(frame!.height).toBeGreaterThan(200);
    expect(frame!.y + frame!.height).toBeLessThanOrEqual(actions!.y + 2);
    await page.screenshot({
      path: info.outputPath(`creator-${viewport.width}-${viewport.height}.png`),
    });
  }
  await page.getByRole("button", { name: "Next Body", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /outfit/i })).toHaveCount(0);
  await page.getByTestId("creator-undo-appearance").click();
  await page.getByRole("button", { name: "Next Body", exact: true }).click();
  await page.getByTestId("creator-reset-appearance").click();
  await begin.click();
  await expect(page.getByTestId("world-orientation")).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByTestId("orientation-step-executive")).toContainText(
    "White House",
  );
  await expect(page.getByTestId("opening-establishing-plate")).toBeVisible();
  await expect(
    page.locator('.pg-opening-president [data-material-group-state="loading"]'),
  ).toHaveCount(0, { timeout: 60_000 });
  await expect(
    page.locator('.pg-opening-president [data-figure-status="ready"]'),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("white-house.png") });
  const president = page.locator(
    ".pg-opening-president .pg-orientation-person",
  );
  const presidentId = (await president.getAttribute("data-testid"))!.replace(
    "orientation-person-",
    "",
  );
  await president.click();
  await expect(page.getByTestId("quick-dossier")).toHaveAttribute(
    "data-person-id",
    presidentId,
  );
  await page.getByTestId("quick-dossier-full").click();
  await expect(page.getByTestId("full-dossier")).toHaveAttribute(
    "data-person-id",
    presidentId,
  );
  await page.getByTestId("dossier-pin").click();
  await page.screenshot({ path: info.outputPath("person-record.png") });
  await page.getByTestId("quick-dossier-close").click();
  const openingDate = page.locator(".pg-orientation-kicker");
  const before = await openingDate.textContent();
  await page.getByTestId("orientation-next").click();
  await expect(page.getByTestId("orientation-step-congress")).toBeVisible();
  await page.getByTestId("orientation-back").click();
  await expect(openingDate).toHaveText(before!);
  await enterLife(page);

  await openShellMenu(page);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("shell-nav-cluster")).toBeFocused();
  await expect(page.getByTestId("shell-nav-flyout")).toHaveCount(0);
  await openPoliticsHub(page, "nav-politics-government");
  await page.getByTestId("politics-sub-map").click();
  await expect(page.getByTestId("political-map")).toBeVisible();
  await expect(page.locator(".pg-map-title")).toContainText("Kentucky");
  await page.getByTestId("map-mode-senate").click();
  await page.getByTestId("map-list-row").first().click();
  await expect(page.getByTestId("map-inspector")).toContainText("Kentucky");
  await page.screenshot({ path: info.outputPath("government-map.png") });
  await page.getByTestId("government-map-workspace-close").click();
  await openPoliticsHub(page, "nav-politics-government");
  await page.getByTestId("politics-sub-map").click();
  await expect(page.getByTestId("map-inspector")).toContainText("Kentucky");
  await page.getByTestId("government-map-workspace-close").click();

  await goTo(page, "nav-places");
  await page.getByTestId("places-offer-walk-neighborhood-action").click();
  await expect(page.getByTestId("places-current-location")).toContainText(
    /neighborhood/i,
  );
  await page.getByTestId("places-offer-walk-home-action").click();
  await expect(page.getByTestId("places-current-location")).toContainText(
    /home/i,
  );
  await page.getByTestId("places-workspace-close").click();
  await goTo(page, "nav-guide");
  await expect(
    page.getByRole("region", { name: "Guide", exact: true }),
  ).toBeVisible();
  await page.getByTestId("guide-workspace-close").click();
  await goTo(page, "nav-news");
  await page.screenshot({ path: info.outputPath("news.png") });
  await page.locator(".pg-news-headline").first().click();
  await expect(page.getByTestId("news-article")).toBeVisible();
  await page.screenshot({ path: info.outputPath("news-article.png") });
  await page.getByTestId("news-workspace-close").click();
  await goTo(page, "nav-calendar");
  const calendar = page.getByTestId("calendar-workspace");
  await expect(calendar).toBeVisible();
  const old = await calendar.boundingBox();
  const header = calendar.locator(".pg-workspace-head h2");
  const box = await header.boundingBox();
  await page.mouse.move(box!.x + 20, box!.y + 10);
  await page.mouse.down();
  await page.mouse.move(box!.x + 70, box!.y + 40, { steps: 8 });
  await page.mouse.up();
  expect((await calendar.boundingBox())!.x).not.toBe(old!.x);
  await calendar.getByRole("button", { name: /Resize Calendar/ }).focus();
  await page.keyboard.press("ArrowDown");
  await calendar.getByRole("button", { name: "Reset layout" }).click();
  await expect(
    calendar.getByRole("button", { name: "Close", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: info.outputPath("calendar.png") });
  await page.getByTestId("calendar-workspace-close").click();
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await expect(page.getByTestId("story-who")).toContainText("Alexandra");
  expect(errors).toEqual([]);
});
