import { privateModularInputs } from "../../src/presentation/private-test-inputs";
import { expect, test } from "./fixtures";
import {
  enterLife,
  fillCreator,
  goTo,
  openPoliticsHub,
  openShellMenu,
  saveLife,
} from "./support/creator";

/*
 * The first walk is a candidate-art review (?art-preview=candidate): the title
 * plate, the creator's wardrobe figure and the opening's president are all
 * drawn from private art. The plate's bytes live under
 * art/generated/candidates/art-desk/, which .gitignore keeps out of the
 * repository, and the figures need the installed modular pack. A checkout
 * without them, CI included, cannot run this walk, so it reports NOT_TESTED
 * rather than failing for want of art; MODULAR_REQUIRE_PRIVATE=1 makes the
 * absence a failure where the private bank is meant to be present.
 */
const candidateArtReady = privateModularInputs("playtest65-u.spec.ts", [
  "art/generated/candidates/art-desk/playtest65/environment/white-house-wide-r6.png",
  "art/manifest/character_candidate_modular45_registry.json",
]);

test.describe.configure({ timeout: 240_000 });

test("PLAYTEST65 creator, opening, map and movable Calendar preserve the life", async ({
  page,
}, info) => {
  test.skip(
    !candidateArtReady,
    "NOT_TESTED: requires the private Art Desk title plate and the installed modular candidate pack.",
  );
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
  const president = page
    .locator(".pg-opening-official-labels .pg-orientation-person")
    .first();
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
  const openingDate = page.locator(
    ".pg-scene-chapter:not([aria-hidden]) .pg-orientation-kicker",
  );
  const before = await openingDate.textContent();
  await page.getByTestId("orientation-next").click();
  await expect(page.getByTestId("orientation-step-state")).toBeVisible();
  await page.getByTestId("orientation-next").click();
  await expect(page.getByTestId("orientation-step-congress")).toBeVisible();
  await page.getByTestId("orientation-back").click();
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

  const homeScene = await page
    .getByTestId("scene-backdrop")
    .getAttribute("data-scene-id");
  expect(homeScene).toBeTruthy();
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
  await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
    "data-scene-id",
    homeScene!,
  );
  await expect(page.getByTestId("scene-backdrop-plate")).toBeVisible();
  await page.screenshot({ path: info.outputPath("returned-home.png") });
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
  await page.getByTestId("calendar-simulate-day").click();
  await calendar
    .getByTestId(/^calendar-entry-/)
    .filter({ hasText: "Journey to the public meeting" })
    .click();
  await page.getByTestId("calendar-play-event").click();
  await calendar
    .getByTestId(/^calendar-entry-/)
    .filter({ hasText: "Posted public meeting" })
    .click();
  await expect(page.getByTestId("calendar-event-actions")).not.toContainText(
    "No authored journey",
  );
  await page.getByTestId("calendar-play-event").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("calendar-time-outcome")).toContainText(
    "You completed Posted public meeting",
  );
  await page.screenshot({ path: info.outputPath("meeting-after-journey.png") });
  await page.getByTestId("calendar-workspace-close").click();
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await expect(page.getByTestId("story-who")).toContainText("Alexandra");
  expect(errors).toEqual([]);
});

test("childhood questionnaire introduces its imagined household and reaches appearance review", async ({
  page,
}, info) => {
  await page.goto(
    "/?art-preview=candidate&seed=playtest65-child-questionnaire",
  );
  await fillCreator(page, {
    age: 10,
    state: "Kentucky",
    place: "Lexington",
    calibration: "short",
  });
  await page.getByTestId("begin").click();
  const prompt = page.getByTestId("questionnaire-prompt");
  await expect(prompt).toContainText("Dee, who looks after you");
  await expect(
    page.getByRole("button", {
      name: "Wake your sister Bea and tell her",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("childhood-questionnaire.png"),
  });
  const sisterOption = page.getByRole("button", {
    name: "Wake your sister Bea and tell her",
    exact: true,
  });
  await sisterOption.focus();
  await page.getByTestId("questionnaire-screen").hover();
  await page.mouse.wheel(0, 400);
  const footerBounds = await page.locator(".game-setup-actions").boundingBox();
  await expect
    .poll(async () => {
      const bounds = await sisterOption.boundingBox();
      return bounds!.y + bounds!.height;
    })
    .toBeLessThanOrEqual(footerBounds!.y);
  await page.screenshot({
    path: info.outputPath("childhood-questionnaire-last-answer.png"),
  });
  const screens = [];
  for (let i = 0; i < 5; i++) {
    await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
    screens.push({
      prompt: await prompt.innerText(),
      options: await page
        .getByTestId("questionnaire-options")
        .getByRole("button")
        .allTextContents(),
    });
    if (i === 0) await sisterOption.click();
    else
      await page
        .getByTestId("questionnaire-options")
        .getByRole("button")
        .first()
        .click();
  }
  await expect(page.getByTestId("questionnaire-screen")).toHaveCount(0);
  await expect(page.getByTestId("begin")).toBeVisible();
  await info.attach("assembled-questionnaire", {
    body: JSON.stringify(
      { age: 10, route: "normal", path: "short", screens },
      null,
      2,
    ),
    contentType: "application/json",
  });
});
