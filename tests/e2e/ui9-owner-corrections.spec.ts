import { expect, test } from "./fixtures";
import { chooseOption, expectChosen } from "./support/controls";
import {
  enterLife,
  goTo,
  openCreator,
  startLife,
  saveLife,
  chooseStartAge,
  answerCharacterBasics,
} from "./support/creator";

/**
 * The corrections the owner's playthrough asked for, walked as a player.
 *
 * Each case here is a defect the owner hit and reported, not a unit of internal
 * structure: a pin that could not be made, two menu entries that were one
 * destination, a walk home offered while at home. They are checked through
 * ordinary controls at ordinary viewports.
 */
test("UI9-04, UI9-02: a government pins, and Personal has two real destinations", async ({
  page,
}) => {
  await page.goto("/?seed=ui9-probe");
  await startLife(page, {
    age: 34,
    route: "custom",
    household: "lives-alone",
    place: "Lexington",
    state: "Kentucky",
  });
  await enterLife(page);

  // UI9-04: pin the government the player is actually in.
  await goTo(page, "nav-municipal");
  await expect(page.getByTestId("municipal-current")).toBeVisible();
  const name = await page.getByTestId("municipal-current-name").textContent();
  await page.getByTestId("municipal-pin").click();
  await expect(page.getByTestId("municipal-pin")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("municipal-workspace-close").click();

  const pin = page.locator('[data-testid^="pin-government:"]');
  await expect(pin).toBeVisible();
  await expect(pin).toContainText(name!.trim());

  // It survives a save and reload, and reopens the same government.
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await expect(page.locator('[data-testid^="pin-government:"]')).toBeVisible();
  await page.locator('[data-testid^="pin-government:"]').click();
  await expect(page.getByTestId("municipal-current-name")).toHaveText(
    name!.trim(),
  );
  await page.getByTestId("municipal-workspace-close").click();

  /*
   * UI9-02: the two Personal entries are different destinations. Each is
   * reached with the one shared walk rather than by pressing the group and
   * then the entry by hand, so the menu is never left standing open on a
   * submenu that the next walk has to climb back out of.
   */
  await goTo(page, "nav-finances");
  await expect(page.getByTestId("personal-finances")).toHaveAttribute(
    "data-landed",
    "true",
  );
  await expect(page.getByTestId("personal-workspace")).toContainText(
    "Money and property",
  );
  await page.getByTestId("personal-workspace-close").click();

  await goTo(page, "nav-personal");
  await expect(page.getByTestId("personal-finances")).not.toHaveAttribute(
    "data-landed",
    "true",
  );
  // Identity comes before the place context.
  const order = await page
    .getByTestId("personal-workspace")
    .locator(
      '[data-testid="personal-name"], [data-testid="personal-economic-context"]',
    )
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-testid")));
  expect(order[0]).toBe("personal-name");
});

test("UI9-06, UI9-07: a child is told why a walk is refused, and what a walk cost", async ({
  page,
}) => {
  await page.goto("/?seed=ui9-child-walk");
  // A blank optional name is accepted: the owner left it blank and expects the
  // game to name the character.
  await startLife(page, { age: 10, place: "Lexington", state: "Kentucky" });
  await enterLife(page);
  /*
   * UI46: walks are errands of the life, not of the scene, so they live in
   * Personal rather than in the room's scene panel. The player reaches them
   * the way anything else is reached: the cluster, then Personal.
   */
  await goTo(page, "nav-personal");
  const personal = page.getByTestId("personal-workspace");
  await personal
    .getByTestId("personal-life-choices")
    .locator("summary")
    .click();

  const scene = personal.getByTestId("opening-life-scene");
  await expect(scene).toBeVisible();

  /*
   * At home, "Walk home" is refused for the reason it is actually refused for,
   * rather than by a message about checking the calendar. The short walk that
   * IS available stays available.
   */
  const home = scene.getByTestId("life-walk-home");
  const nearby = scene.getByTestId("life-walk-neighborhood");
  await expect(home).toBeDisabled();
  await expect(scene.getByTestId("life-walk-home-reason")).toHaveText(
    "You are already home.",
  );
  await expect(nearby).toBeEnabled();

  /*
   * Taking it reports the clock and where it left them, so a player does not
   * have to guess whether a walk happened.
   */
  await nearby.click();
  const outcome = scene.getByTestId("life-scene-outcome");
  await expect(outcome).toBeVisible();
  await expect(outcome).toContainText("→");

  // And now the refusals have swapped over, because the character has moved.
  await expect(scene.getByTestId("life-walk-neighborhood")).toBeDisabled();
  await expect(scene.getByTestId("life-walk-neighborhood-reason")).toHaveText(
    "You are already out in your neighborhood.",
  );
  await expect(scene.getByTestId("life-walk-home")).toBeEnabled();
});

test("UI9-10: the starting age is derived from the birthday, never a half-typed number", async ({
  page,
}) => {
  await page.goto("/?seed=ui9-age-buffer");
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await expect(page.getByTestId("creator-stage-character")).toBeVisible();

  /*
   * The owner's "0-2-5" came from a typed age box. The age is now derived
   * from a chosen birth year and shown, so there is no partial entry to
   * commit: nothing is chosen until a year is, and a later anniversary makes
   * the same year one year younger on the day play starts.
   */
  const derived = page.getByTestId("creator-derived-age");
  await expect(page.getByTestId("creator-continue-character")).toBeDisabled();
  await expect(derived).toContainText("Choose a birth year");
  await chooseStartAge(page, 25);
  await expect(derived).toContainText("age 25,");
  await chooseOption(page.getByTestId("start-birth-month"), "7");
  await chooseOption(page.getByTestId("start-birth-day"), "14");
  await expectChosen(page.getByTestId("start-birth-year"), "2001");
  await expect(derived).toContainText("age 24,");
  await answerCharacterBasics(page);
  await expect(page.getByTestId("creator-continue-character")).toBeEnabled();
});
