import { expect, test, type Page } from "@playwright/test";
import {
  enterLife,
  goTo,
  openShellMenu,
  saveLife,
  startLife,
} from "./support/creator";

/**
 * UI46: what follows a played life, reached the way a player reaches it.
 *
 * An adult who shares a home retires from play from Options, through the
 * in-game confirmation. The continuation view says who could be played next,
 * or why nobody can. Keeping observing leaves a read-only shell labelled
 * Observing with no time controls. Saving and reloading that observed world
 * is the second test, which waits on a simulation repair described there.
 */
async function beginAdultWhoSharesAHome(page: Page) {
  await page.goto("/");
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 34,
    route: "custom",
    household: "shares-a-home",
    calibration: "skipped",
  });
  await enterLife(page);
}

async function retireAndKeepObserving(page: Page) {
  await goTo(page, "nav-options");
  await page.getByTestId("retire-from-play").click();
  await page.getByTestId("retire-confirm-yes").click();
  await expect(page.getByTestId("life-continuation")).toBeVisible();
  await page.getByTestId("life-continuation-observe").click();
  await expect(page.getByTestId("observing-label")).toBeVisible();
}

test("retire from play, then keep observing a read-only world", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await beginAdultWhoSharesAHome(page);

  // Options > Retire from play, asked in place; Escape backs out first.
  await goTo(page, "nav-options");
  const retire = page.getByTestId("retire-from-play");
  await retire.click();
  await expect(page.getByTestId("retire-confirm")).toBeVisible();
  await expect(page.getByTestId("retire-confirm-yes")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("retire-confirm")).toBeHidden();
  await expect(retire).toBeFocused();
  await retire.click();
  await page.getByTestId("retire-confirm-yes").click();

  // The continuation view, over the room.
  const panel = page.getByTestId("life-continuation");
  await expect(panel).toBeVisible();
  await expect(page.getByTestId("life-continuation-heading")).toContainText(
    "You stopped playing",
  );
  await expect(page.getByTestId("life-continuation-heading")).toBeFocused();
  const choices = page.locator('[data-testid^="continue-as-"]');
  const reason = page.getByTestId("life-continuation-no-successor");
  expect((await choices.count()) > 0 || (await reason.isVisible())).toBe(true);
  // While the choice is open, time does not move.
  await expect(page.getByTestId("shell-day-controls")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("continuation.png") });

  // The finished life's record is one press away, and back again.
  await page.getByTestId("life-continuation-record").click();
  await expect(page.getByTestId("person-workspace")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();

  // Keep observing.
  await page.getByTestId("life-continuation-observe").click();
  await expect(panel).toBeHidden();
  const observing = page.getByTestId("observing-label");
  await expect(observing).toBeVisible();
  await expect(observing).toContainText("Observing");
  await expect(page.getByTestId("story-who")).toHaveText("Observing");
  await expect(page.getByTestId("shell-day-controls")).toHaveCount(0);

  // Reading surfaces stay; acting ones are gone from the menu.
  await openShellMenu(page);
  await expect(page.getByTestId("elsewhere-people")).toBeVisible();
  await expect(page.getByTestId("nav-news")).toBeVisible();
  await expect(page.getByTestId("nav-journal-entry")).toBeVisible();
  await expect(page.getByTestId("nav-politics")).toBeVisible();
  await expect(page.getByTestId("nav-calendar")).toHaveCount(0);
  await expect(page.getByTestId("nav-jobs")).toHaveCount(0);
  await expect(page.getByTestId("nav-places")).toHaveCount(0);
  await page.getByTestId("nav-journal-entry").click();
  await expect(page.getByTestId("journal")).toBeVisible();
  await page.keyboard.press("Escape");

  // The continuation view can be reopened, and put away with Escape.
  const reopen = page.getByTestId("open-continuation");
  await reopen.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(reopen).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("observing.png") });

  expect(errors).toEqual([]);
});

/*
 * KNOWN DEFECT, outside the UI lane. An observed World cannot be written:
 * `createWorldSnapshot` runs `assertWorldIntegrity`, and time-work's
 * `validateInitialWorkResponsibility` requires every player-required work
 * state (the opening household week, for one) to be assigned to the
 * CURRENTLY controlled person. `keepObserving` (and `continueAsRelative`)
 * move control without releasing the predecessor's player-required work, so
 * the snapshot throws "Player-required work must be assigned to the
 * controlled person." and Save reports that the game could not be saved.
 * Marked as an expected failure so it starts failing loudly once the
 * simulation side is repaired.
 */
test("an observed world saves, reloads and continues as itself", async ({
  page,
}) => {
  test.fail();
  test.setTimeout(240_000);
  await beginAdultWhoSharesAHome(page);
  await retireAndKeepObserving(page);
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await expect(page.getByTestId("observing-label")).toBeVisible();
  await expect(page.getByTestId("story-who")).toHaveText("Observing");
  await expect(page.getByTestId("shell-day-controls")).toHaveCount(0);
});
