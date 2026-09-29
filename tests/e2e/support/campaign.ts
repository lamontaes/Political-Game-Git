import { expect, type Page } from "../fixtures";
import {
  goTo,
  openElsewhere,
  passShellTime,
  waitForClockIdle,
} from "./creator";
import { chooseStateLegislativeOffice } from "./jurisdictions";

/**
 * Deliberate office selection, in whatever state the life was started in.
 *
 * A caller that cares which seat still names one. A caller that just wants
 * "the seat in the legislature here" leaves it out and gets the lower chamber
 * the player's own browser offers — which used to default to
 * `us-ky-general-assembly-v1:house`, a Kentucky literal that quietly made
 * every journey through this helper a Kentucky journey. Returns the office key
 * actually filed for.
 */
export async function fileCandidacy(
  page: Page,
  officeKey?: string,
): Promise<string> {
  let filed = officeKey;
  if (filed === undefined) {
    filed = await chooseStateLegislativeOffice(page, "lower");
  } else {
    await page
      .getByTestId("campaign-office-browser")
      .locator(`input[value="${filed}"]`)
      .check();
  }
  await page.getByTestId("file-candidacy").click();
  return filed;
}

/**
 * Campaigns the ordinary way until the contest is decided: every day the
 * outreach control is offered it is taken, then the day passes. Since
 * CRUNCH46 (d60b2975) the rival campaigns weekly, so the three outreach
 * afternoons these journeys used to spend no longer carry the seat, and no
 * fixed number does durably either — GOVERNING's probe on p85c-owner-0 found
 * six days still losing while working every offered day wins. A day whose
 * afternoon is already spoken for renders the offer disabled and is skipped.
 * Returns whether the result surface appeared within `maxDays`.
 */
export async function campaignUntilDecided(
  page: Page,
  passDay: (page: Page) => Promise<void>,
  maxDays = 45,
) {
  for (let day = 0; day < maxDays; day += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await workOfferedOutreach(page);
    await passDay(page);
    await waitForClockIdle(page);
  }
  return campaignWeeklyUntilDecided(page);
}

/**
 * A state legislative race is decided on the state's own election day, which
 * from a January start is most of a year away. After the daily push the
 * campaign carries on the way a player would carry it: take the week's
 * outreach, then let the week run. Returns whether the result appeared.
 */
export async function campaignWeeklyUntilDecided(page: Page, maxWeeks = 110) {
  for (let week = 0; week < maxWeeks; week += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await workOfferedOutreach(page);
    await passShellTime(page, "week");
    await expect(page.getByTestId("shell-pass-week")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  }
  return page.getByTestId("campaign-result").isVisible();
}

/**
 * Takes the outreach offer if the day still has room for it. The offer can
 * flip to disabled as the new day renders; wait for the shell clock first.
 */
export async function workOfferedOutreach(page: Page) {
  await waitForClockIdle(page);
  await expect(page.getByTestId("shell-pass-day")).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
  const outreach = page.getByTestId("campaign-outreach");
  // isEnabled() waits for the control to exist; on a day the campaign offers
  // nothing there is none, and that is a day to pass, not a wait.
  if ((await outreach.count()) > 0 && (await outreach.isEnabled()))
    await outreach.click();
}

/**
 * Goes to the newest accepted party-work row, briefly, until its outcome is
 * recorded. A row can be set for later in the day, or clash with an earlier
 * commitment; then the day is passed and the row tried again, the way a
 * player gets on with the day until the evening.
 */
async function attendNewestPartyWork(page: Page) {
  const partyWork = page.getByTestId("party-work");
  const row = partyWork.locator('li[data-state="accepted"]').first();
  await expect(row).toBeVisible();
  const rowId = (await row.getAttribute("data-testid"))!;
  const sameRow = partyWork.getByTestId(rowId);
  const outcome = sameRow.locator('[data-testid^="party-work-outcome-"]');
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const go = sameRow.locator('[data-testid^="party-work-attend-condensed-"]');
    if ((await go.count()) > 0) await go.click();
    const went = await outcome
      .waitFor({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (went) return;
    await waitForClockIdle(page);
    await page.getByTestId("shell-pass-day").click();
    await waitForClockIdle(page);
  }
  await expect(outcome).toBeVisible();
}

/**
 * A campaign without paid staff has nobody to host its work until a local
 * party chapter agrees to. The campaign says so ("Ask a local chapter
 * organizer for support"). An organizer weighs whether the candidate is a
 * member and has turned up for the chapter's work before, so this does what a
 * player would: join a chapter on Politics > Parties, go to its meetings,
 * then ask its organizer. A "later" or a "no" is answered with more meetings
 * and another ask; a chapter that still says no is left for the next one.
 * The organizer decides; this never forces a yes. Ends back on
 * the campaign and returns whether the chapter agreed.
 */
export async function askChapterOrganizerForSupport(page: Page) {
  await goTo(page, "nav-parties");
  const workspace = page.getByTestId("parties-workspace");
  await expect(workspace).toBeVisible();
  // One chapter's organizer may decline; the player can ask the next one.
  const chapterIds = (
    await workspace
      .locator('[data-testid^="chapter-join-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-testid")!),
      )
  ).map((id) => id.slice("chapter-join-".length));
  let granted = false;
  for (const chapterId of chapterIds) {
    if (granted) break;
    await workspace.getByTestId(`chapter-join-${chapterId}`).click();
    // The organizer weighs the work the player has turned up for, so each
    // round shows up for more of it before asking again.
    for (let round = 0; round < 3 && !granted; round += 1) {
      for (let meeting = 0; meeting <= round; meeting += 1) {
        await workspace
          .getByTestId(`party-work-request-organization-meeting-${chapterId}`)
          .click();
        await attendNewestPartyWork(page);
      }
      await workspace
        .getByTestId(`party-work-request-support-request-${chapterId}`)
        .click();
      await attendNewestPartyWork(page);
      const answer =
        (await workspace
          .locator('li[data-state="completed"]')
          .first()
          .textContent()) ?? "";
      granted = !/will not back|take it up later/.test(answer);
    }
    // A player belongs to one chapter at a time; leave before asking another.
    if (!granted)
      await workspace.getByTestId(`chapter-leave-${chapterId}`).click();
  }
  await openElsewhere(page, "campaign");
  await expect(page.getByTestId("work-section-campaign")).toBeVisible();
  return (await page.locator('[data-testid^="campaign-book-"]').count()) > 0;
}

/**
 * Puts one of the week's campaign choices on the calendar and goes to it:
 * the named form, or with none named whichever the week offers first.
 * Returns false when the week offers nothing that fits.
 */
export async function bookAndHoldCampaignChoice(
  page: Page,
  form?: "door-canvass" | "phone-shift" | "fundraiser",
) {
  const book = page
    .locator(
      form === undefined
        ? '[data-testid^="campaign-book-"]'
        : `[data-testid="campaign-book-${form}"]`,
    )
    .first();
  if ((await book.count()) === 0) return false;
  await book.click();
  await attendNewestPartyWork(page);
  await expect(page.getByTestId("campaign-recent-results")).toBeVisible();
  return true;
}
