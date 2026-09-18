import { test, expect } from "./fixtures";
import {
  startLife,
  enterLife,
  saveLife,
  openCreator,
  openElsewhere,
  goTo,
  openNewsContext,
  chooseStartAge,
} from "./support/creator";

/*
 * The corner cluster draws the player's own portrait, and a workspace can draw
 * more than one of somebody else — a dossier's head-and-shoulders and the
 * preview beside the wardrobe controls are both portraits. Naming the portrait
 * by test id alone therefore names several elements, so each case scopes to
 * the workspace it is about and takes that surface's first. What is checked is
 * unchanged: the surface under review draws a portrait.
 */
const PORTRAIT = '[data-testid="person-portrait"]';

test("current normal scene and saved-person dossier remain available for owner review", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-save5-owner-review");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 34,
    household: "shares-a-home",
  });
  await enterLife(page);
  await saveLife(page);
  await page.getByTestId("shell-nav-cluster").click();
  await page.screenshot({
    path: info.outputPath("normal-scene.png"),
    fullPage: true,
  });
  await page.locator('[data-testid^="scene-person-"]').first().click();
  await expect(page.getByTestId("quick-dossier")).toBeVisible();
  await page.getByTestId("quick-dossier-full").click();
  await expect(page.getByTestId("saved-appearance-controls")).toHaveCount(0);
  await expect(
    page.getByTestId("person-workspace").locator(PORTRAIT).first(),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("normal-npc-dossier.png"),
    fullPage: true,
  });

  await goTo(page, "nav-group-personal");
  await page.getByTestId("nav-personal").click();
  await page.getByTestId("personal-appearance").click();
  const controls = page.getByTestId("saved-appearance-controls");
  await controls.locator("summary").focus();
  await controls.locator("summary").press("Enter");
  await expect(controls).toHaveAttribute("open", "");
  await expect(
    page.getByTestId("personal-workspace").locator(PORTRAIT).first(),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("normal-own-wardrobe.png"),
    fullPage: true,
  });
});

/**
 * The rest of the named owner visual set.
 *
 * UI-FINISH8 was asked for a small, named set of current normal screens for an
 * owner decision: the scene and the dossier/wardrobe above, plus the creator,
 * the work and study surface and the newspaper. These are captures of what the
 * build actually renders on a normal start — nothing here fabricates a state to
 * make a screen look finished, and none of it is an art approval.
 */
test("the rest of the named owner visual set renders on a normal start", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-finish8-owner-visuals");
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await expect(page.getByTestId("creator-stage-character")).toBeVisible();
  await chooseStartAge(page, 38);
  await page.screenshot({
    path: info.outputPath("normal-creator.png"),
    fullPage: true,
  });

  await page.goto("/?seed=ui-finish8-owner-visuals");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 38,
    route: "normal",
  });
  await enterLife(page);

  await openElsewhere(page, "work");
  await expect(page.getByTestId("personal-work-section")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("normal-work-study.png"),
    fullPage: true,
  });

  // The newspaper on a normal start, in the state a normal start actually
  // reaches it: nothing has been published yet, and the surface says so rather
  // than inventing a reporter or a story to fill itself. Publishing into it
  // requires a member seat, which this journey does not have.
  await goTo(page, "nav-news");
  await openNewsContext(page, "directory");
  await expect(page.getByTestId("public-information-empty")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("normal-news.png"),
    fullPage: true,
  });
});
