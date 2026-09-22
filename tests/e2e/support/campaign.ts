import { expect, type Page } from "../fixtures";
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
  }
  return page.getByTestId("campaign-result").isVisible();
}

/**
 * Takes the outreach offer if the day still has room for it. The day control
 * reports aria-busy while a time command settles, and the offer can flip to
 * disabled as the new day renders; checking before the clock is idle raced
 * that flip and click() then waited on a disabled control until the test
 * timed out.
 */
export async function workOfferedOutreach(page: Page) {
  // The shell's own day control when the Today page is not on screen (a
  // Politics window covers it), the Today page's otherwise.
  await expect(
    page.getByTestId("shell-pass-day").or(page.getByTestId("pass-day")).first(),
  ).not.toHaveAttribute("aria-busy", "true");
  const outreach = page.getByTestId("campaign-outreach");
  // isEnabled() waits for the control to exist; on a day the campaign offers
  // nothing there is none, and that is a day to pass, not a wait.
  if ((await outreach.count()) > 0 && (await outreach.isEnabled()))
    await outreach.click();
}
