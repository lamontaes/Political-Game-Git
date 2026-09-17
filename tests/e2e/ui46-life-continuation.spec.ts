import { execFileSync } from "node:child_process";
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

async function retire(page: Page) {
  await goTo(page, "nav-options");
  await page.getByTestId("retire-from-play").click();
  await page.getByTestId("retire-confirm-yes").click();
  await expect(page.getByTestId("life-continuation")).toBeVisible();
}

async function retireAndKeepObserving(page: Page) {
  await retire(page);
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

/* An observed World saves, reloads and opens as itself. */
test("an observed world saves, reloads and continues as itself", async ({
  page,
}) => {
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

/**
 * "Continue as <adult child>", reached through ordinary play.
 *
 * Generated openings record no children of the player, so PEOPLE's fixture
 * adds one through the supported family-addition command. That world enters
 * the browser the way any saved life from elsewhere does: written by the
 * game's own portable-save export into a file, and imported from Saved games.
 * Saved games is only offered once something is saved, so a first life is
 * started and kept before the import, exactly as a player would have to.
 */
function heirSaveFile(outFile: string): {
  readonly playerName: string;
  readonly childName: string;
  readonly childPersonId: string;
} {
  return JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "tests/e2e/support/people-heir-save.ts", outFile],
      { encoding: "utf8" },
    ),
  ) as ReturnType<typeof heirSaveFile>;
}

test("continue as an adult child, then save and reload as them", async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const file = testInfo.outputPath("heir.ocd-life.json");
  const heir = heirSaveFile(file);

  // A first life, kept, so Saved games opens.
  await beginAdultWhoSharesAHome(page);
  await saveLife(page);
  await page.reload();

  // Saved games > Import a saved life.
  await page.getByTestId("open-saves").click();
  await expect(page.getByTestId("saves-screen")).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("import-save").click();
  await (await chooser).setFiles(file);
  await expect(
    page.getByText("Imported as a new save of the same life.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  const entry = page
    .getByTestId("save-entry")
    .filter({ hasText: heir.playerName });
  await expect(entry).toHaveCount(1);
  await entry.getByRole("button", { name: "Open", exact: true }).click();
  await enterLife(page);
  await expect(page.getByTestId("story-who")).toHaveText(heir.playerName);

  // Options > Retire from play > confirm.
  await retire(page);
  const choice = page.getByTestId(`continue-as-${heir.childPersonId}`);
  await expect(choice).toHaveText(`Continue as ${heir.childName}`);
  await page.screenshot({ path: testInfo.outputPath("heir-choice.png") });
  await choice.click();

  // The child is now the played person, and time runs again.
  await expect(page.getByTestId("life-continuation")).toBeHidden();
  await expect(page.getByTestId("story-who")).toHaveText(heir.childName);
  await expect(page.getByTestId("observing-label")).toHaveCount(0);
  await expect(page.getByTestId("shell-day-controls")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("heir-playing.png") });

  // Save > reload > Continue: still the child.
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await expect(page.getByTestId("story-who")).toHaveText(heir.childName);
  await expect(page.getByTestId("observing-label")).toHaveCount(0);
  await expect(page.getByTestId("shell-day-controls")).toBeVisible();

  expect(errors).toEqual([]);
});
