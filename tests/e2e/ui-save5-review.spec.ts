import { test, expect } from "./fixtures";
import {
  startLife,
  enterLife,
  saveLife,
  openCreator,
  openElsewhere,
  goTo,
} from "./support/creator";

test("current normal scene and saved-person dossier remain available for owner review", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-save5-owner-review");
  await startLife(page, { age: 34, household: "shares-a-home" });
  await enterLife(page);
  await saveLife(page);
  await page.getByTestId("shell-nav-cluster").click();
  await page.screenshot({
    path: info.outputPath("normal-scene.png"),
    fullPage: true,
  });
  await page.locator('[data-testid^="scene-person-"]').first().click();
  await page.getByTestId("action-inspect").click();
  await page.getByTestId("quick-dossier-full").click();
  const controls = page.getByTestId("saved-appearance-controls");
  await controls.locator("summary").focus();
  await controls.locator("summary").press("Enter");
  await expect(controls).toHaveAttribute("open", "");
  await expect(page.getByTestId("person-portrait")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("normal-dossier-wardrobe.png"),
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
  await page.getByTestId("start-age").fill("38");
  await page.screenshot({
    path: info.outputPath("normal-creator.png"),
    fullPage: true,
  });

  await page.goto("/?seed=ui-finish8-owner-visuals");
  await startLife(page, { age: 38, route: "normal" });
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
  await expect(page.getByTestId("public-information-empty")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("normal-news.png"),
    fullPage: true,
  });
});
