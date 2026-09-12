import { expect, test } from "./fixtures";
import {
  enterLife,
  goTo,
  openCreator,
  startLife,
  saveLife,
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

  // UI9-02: the two Personal entries are different destinations.
  await goTo(page, "nav-personal-group");
  await page.getByTestId("nav-finances").click();
  await expect(page.getByTestId("personal-finances")).toHaveAttribute(
    "data-landed",
    "true",
  );
  await expect(page.getByTestId("personal-workspace")).toContainText(
    "Money and property",
  );
  await page.getByTestId("personal-workspace-close").click();

  await goTo(page, "nav-personal-group");
  await page.getByTestId("nav-personal").click();
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
  await startLife(page, { age: 10, place: "Lexington" });
  await enterLife(page);
  /*
   * PT3: there is no "Life scenes" menu entry any more — it was a second copy
   * of the panel already standing in the room. `enterLife` steps into the
   * continuing life, so the way back to the scene is the panel's own control.
   */
  await page.getByRole("button", { name: "Return to your day" }).click();

  const scene = page.getByTestId("opening-life-scene");
  await expect(scene).toBeVisible();

  /*
   * At home, "Walk home" is refused for the reason it is actually refused for,
   * rather than by a message about checking the calendar. The short walk that
   * IS available stays available.
   */
  const home = page.getByTestId("life-walk-home");
  const nearby = page.getByTestId("life-walk-neighborhood");
  await expect(home).toBeDisabled();
  await expect(page.getByTestId("life-walk-home-reason")).toHaveText(
    "You are already home.",
  );
  await expect(nearby).toBeEnabled();

  /*
   * Taking it reports the clock and where it left them, so a player does not
   * have to guess whether a walk happened.
   */
  await nearby.click();
  const outcome = page.getByTestId("life-scene-outcome");
  await expect(outcome).toBeVisible();
  await expect(outcome).toContainText("→");

  // And now the refusals have swapped over, because the character has moved.
  await expect(page.getByTestId("life-walk-neighborhood")).toBeDisabled();
  await expect(page.getByTestId("life-walk-neighborhood-reason")).toHaveText(
    "You are already out in your neighborhood.",
  );
  await expect(page.getByTestId("life-walk-home")).toBeEnabled();
});

test("UI9-10: clearing the age field and retyping does not leave a leading zero", async ({
  page,
}) => {
  await page.goto("/?seed=ui9-age-buffer");
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await expect(page.getByTestId("creator-stage-character")).toBeVisible();

  const age = page.getByTestId("start-age");

  /*
   * The owner's "0-2-5". Clearing the box used to write 0 into the setup
   * immediately, and because the field was bound to that number it redrew as
   * "0" — so typing 2 then 5 gave "025" rather than "25". The field now holds
   * its own text and only a real age is committed.
   */
  await age.fill("");
  await expect(age).toHaveValue("");
  await age.pressSequentially("25");
  await expect(age).toHaveValue("25");

  /*
   * Leaving the field empty is not silently an age of 0: blur puts back the
   * age the game will actually use, which is the last one that parsed.
   */
  await age.fill("");
  await page.getByLabel("First name", { exact: true }).click();
  await expect(age).toHaveValue("25");
});
