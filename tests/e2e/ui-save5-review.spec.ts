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

/* The corner cluster draws the player's own portrait; these look at another. */
const OUTSIDE_NAV_PORTRAIT =
  '[data-testid="person-portrait"]:not([data-testid="shell-nav"] *)';

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
  await expect(page.locator(OUTSIDE_NAV_PORTRAIT)).toBeVisible();
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
  await expect(page.locator(OUTSIDE_NAV_PORTRAIT)).toBeVisible();
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
  // reaches it. A seeded opening now carries outlets that have already filed,
  // so this is no longer empty — but the thing the emptiness was guarding is
  // still asserted, and more directly: every story present names the event it
  // reports, so none of it was invented to fill the surface. Publishing into
  // it requires a member seat, which this journey does not have.
  await goTo(page, "nav-news");
  await openNewsContext(page, "directory");
  const articles = page.locator(".public-information-article");
  await expect(articles.first()).toBeVisible();
  for (const article of await articles.all()) {
    await expect(article).toHaveAttribute("data-source-event-id", /.+/);
  }
  await page.screenshot({
    path: info.outputPath("normal-news.png"),
    fullPage: true,
  });
});
