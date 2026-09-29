import { expect, test, type Page } from "./fixtures";
import {
  KENTUCKY_LEXINGTON_REGRESSION,
  enterLife,
  openElsewhere,
  startLife,
} from "./support/creator";

/**
 * The owner's playtest stalled on a meeting day: after saying yes to a
 * chapter's open meeting, Day stopped with "Journey to the community room
 * comes first." and nothing on screen to press, so the life could not move on
 * (measured on main dbec3b797, seed below: stuck on January 13, 2026). The
 * stop now opens that meeting in the calendar, where going is one press, and
 * after the meeting the days pass again.
 */

async function passDaysUntil(page: Page, subject: string, maxDays: number) {
  for (let day = 0; day < maxDays; day += 1) {
    await openElsewhere(page, "people");
    await expect(page.getByTestId("people-overlay")).toBeVisible();
    const starter = page.getByTestId(`conversation-start-${subject}`);
    if (
      (await starter.count()) > 0 &&
      !(await starter.innerText()).includes("settled for now")
    ) {
      return starter;
    }
    await page.keyboard.press("Escape");
    await page.getByTestId("shell-pass-day").click();
    await expect(page.getByTestId("shell-pass-day")).toBeEnabled();
  }
  throw new Error(`No ${subject} conversation after ${maxDays} days.`);
}

async function shownDate(page: Page) {
  return (await page.getByTestId("shell-nav-cluster").innerText()).match(
    /[A-Z][a-z]+ \d{1,2}, \d{4}/,
  )![0];
}

test("a day stopped by an accepted meeting opens it, and days pass after it", async ({
  page,
}) => {
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  // The same replay seed as the dialogue panel check: the invitation comes
  // on January 8 for a meeting on January 13.
  await page.goto("/?seed=ui-lane-dialogue-panel");
  await startLife(page, {
    ...KENTUCKY_LEXINGTON_REGRESSION,
    age: 34,
    route: "custom",
    household: "shares-a-home",
  });
  await enterLife(page);

  const invite = await passDaysUntil(page, "scene-party-invite", 60);
  await invite.click();
  await page.getByTestId("intent-say-yes").click();
  await expect(page.getByTestId("conversation-beat")).toContainText(
    /I’ll look for you|See you/,
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  // Pass days until one stops for the meeting.
  const outcome = page.getByTestId("pass-outcome");
  const open = page.getByTestId("pass-outcome-open-blocker");
  for (let day = 0; day < 14 && (await open.count()) === 0; day += 1) {
    await page.getByTestId("shell-pass-day").click();
    await expect(page.getByTestId("shell-pass-day")).toBeEnabled();
  }
  await expect(outcome).toContainText("comes first");
  const stuckOn = await shownDate(page);

  await open.click();
  await expect(page.getByTestId("calendar-workspace")).toBeVisible();
  const actions = page.getByTestId("calendar-event-actions");
  await expect(actions).toBeVisible();
  await expect(page.getByTestId("calendar-selection")).toContainText(
    "open meeting",
  );
  await actions.getByTestId("calendar-play-event").click();
  await expect(page.getByTestId("shell-pass-day")).toBeEnabled();

  // The meeting is behind the player: the next day comes.
  await page.keyboard.press("Escape");
  await page.getByTestId("shell-pass-day").click();
  await expect(page.getByTestId("shell-pass-day")).toBeEnabled();
  await expect.poll(() => shownDate(page)).not.toBe(stuckOn);
  await expect(page.getByTestId("pass-outcome-open-blocker")).toHaveCount(0);
});
